// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Focusling is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct Pet {
        uint256 xp;
        uint256 health;
        uint256 lastInteraction;
        uint256 birthTime;
        string username;
        string petName;
        uint256 streak;
        uint256 lastDailySession;
        uint256 boostEndTime;
        uint256 shieldCount;
        string activeCosmetic;
        uint256 totalFocusTime;
    }

    mapping(address => Pet) public pets;

    IERC20 public usdc;

    uint256 public constant MAX_HEALTH = 100;
    uint256 public constant DECAY_RATE_PER_DAY = 10;

    // USDC prices (6 decimals)
    uint256 public constant PRICE_FOOD_USDC         = 100_000;   // $0.10
    uint256 public constant PRICE_SUPER_FOOD_USDC   = 250_000;   // $0.25
    uint256 public constant PRICE_ENERGY_DRINK_USDC = 200_000;   // $0.20
    uint256 public constant PRICE_SHIELD_USDC       = 500_000;   // $0.50
    uint256 public constant PRICE_REVIVE_USDC       = 250_000;   // $0.25

    // NIM prices, in Luna (1 NIM = 100,000 Luna). Flat NIM-denominated prices
    // rather than a USD peg — no price feed dependency.
    uint256 public constant PRICE_FOOD_NIM         = 500_000;    // 5 NIM
    uint256 public constant PRICE_SUPER_FOOD_NIM   = 1_200_000;  // 12 NIM
    uint256 public constant PRICE_ENERGY_DRINK_NIM = 1_000_000;  // 10 NIM
    uint256 public constant PRICE_SHIELD_NIM       = 2_500_000;  // 25 NIM
    uint256 public constant PRICE_REVIVE_NIM       = 1_200_000;  // 12 NIM

    // Nimiq has no general-purpose smart contracts, so this contract has no
    // way to independently verify a NIM payment made on Nimiq's chain — the
    // caller attests to nimTxHash after Nimiq Pay's own confirmation dialog
    // has already gone through. usedNimTx exists only so the same payment
    // can't be submitted twice; it is not a payment-verification mechanism.
    mapping(bytes32 => bool) public usedNimTx;

    event PetFed(address indexed owner, uint256 newHealth, uint256 newXp);
    event ItemPurchasedWithUSDC(address indexed buyer, string item, uint256 usdcAmount);
    event ItemPurchasedWithNIM(address indexed buyer, string item, uint256 nimAmountLuna, bytes32 nimTxHash);
    event PetBorn(address indexed owner);
    event NamesUpdated(address indexed owner, string username, string petName);
    event BoostActivated(address indexed owner, uint256 endTime);
    event ShieldAdded(address indexed owner, uint256 newCount);
    event UserDeleted(address indexed owner);
    event PetMigrated(address indexed from, address indexed to);
    event LaunchDiscountSet(uint256 discountBps, uint256 discountEndTime);
    event FocusSessionRecorded(
        address indexed owner,
        uint256 duration,
        uint256 xpEarned,
        uint256 newTotalFocusTime,
        uint256 streak,
        uint256 newHealth
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _usdc, address _treasury) public initializer {
        __Ownable_init(msg.sender);

        usdc = IERC20(_usdc);
        treasury = _treasury != address(0) ? _treasury : msg.sender;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ── Admin setters ─────────────────────────────────────────────────────────

    function setTreasury(address _newTreasury) public onlyOwner {
        treasury = _newTreasury;
    }

    // Call this once after deploying to (re)point the USDC token address.
    // Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    function setUsdc(address _usdc) public onlyOwner {
        usdc = IERC20(_usdc);
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier hasPet() {
        require(pets[msg.sender].birthTime > 0, "No pet found");
        _;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _initPet(address owner) internal {
        pets[owner] = Pet({
            xp: 0,
            health: MAX_HEALTH,
            lastInteraction: block.timestamp,
            birthTime: block.timestamp,
            username: "",
            petName: "Unnamed Egg",
            streak: 1,
            lastDailySession: block.timestamp,
            boostEndTime: 0,
            shieldCount: 0,
            activeCosmetic: "",
            totalFocusTime: 0
        });
        totalUsers += 1;
        emit PetBorn(owner);
    }

    function _handleHealthDecay(Pet storage pet, uint256 timeDiff) internal {
        uint256 healthLoss = (timeDiff / 1 days) * DECAY_RATE_PER_DAY;
        pet.health = (healthLoss > pet.health) ? 0 : pet.health - healthLoss;
    }

    function _settlePet(Pet storage pet) internal {
        uint256 timeDiff = block.timestamp - pet.lastInteraction;
        _handleHealthDecay(pet, timeDiff);
        pet.lastInteraction = block.timestamp;
    }

    function _updateStreak(Pet storage pet) internal {
        uint256 lastSessionDay = pet.lastDailySession / 1 days;
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastSessionDay) {
            if (currentDay == lastSessionDay + 1) {
                pet.streak += 1;
            } else if (pet.shieldCount > 0) {
                pet.shieldCount -= 1;
                emit ShieldAdded(msg.sender, pet.shieldCount);
            } else {
                pet.streak = 1;
            }
            pet.lastDailySession = block.timestamp;
        }
    }

    function _awardRewards(Pet storage pet, uint256 duration) internal {
        uint256 bonus = (pet.streak > 1) ? min(20, (pet.streak - 1) * 5) : 0;
        uint256 finalXP = duration + (duration * bonus / 100);

        if (block.timestamp < pet.boostEndTime) {
            pet.xp += (finalXP * 2);
        } else {
            pet.xp += finalXP;
        }

        pet.health = min(MAX_HEALTH, pet.health + 5);
        pet.totalFocusTime += duration;
        totalGlobalFocusTime += duration;
    }

    function _settleUser(address user) internal {
        if (pets[user].birthTime == 0) return;
        _settlePet(pets[user]);
    }

    // ── Launch discount ───────────────────────────────────────────────────────
    // Set discountBps to e.g. 3000 for 30% off, and discountEndTime to a Unix
    // timestamp. The discount auto-expires — no second call needed to turn it off.
    // Set discountBps = 0 to disable immediately if needed.
    function setLaunchDiscount(uint256 bps, uint256 endTime) external onlyOwner {
        require(bps < 10000, "Focusling: discount must be < 100%");
        discountBps = bps;
        discountEndTime = endTime;
        emit LaunchDiscountSet(bps, endTime);
    }

    // Returns the effective price after applying the active discount, if any.
    function _discountedPrice(uint256 basePrice) internal view returns (uint256) {
        if (discountBps > 0 && block.timestamp < discountEndTime) {
            return basePrice - (basePrice * discountBps / 10000);
        }
        return basePrice;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Pulls USDC from the caller to treasury.
    function _splitPaymentUSDC(uint256 amount) internal {
        require(address(usdc) != address(0), "USDC not configured");
        _settleUser(msg.sender);
        address target = treasury != address(0) ? treasury : address(this);
        require(usdc.transferFrom(msg.sender, target, amount), "USDC transfer failed");
        totalVolumeUSDC += amount;
    }

    // ── USDC buy functions ────────────────────────────────────────────────────

    // +20 Health — base $0.10 USDC (discount applied if active)
    function buyFoodWithUSDC() public {
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        require(pet.health > 0, "Pet is dead");
        uint256 price = _discountedPrice(PRICE_FOOD_USDC);
        _splitPaymentUSDC(price);
        pet.health = min(MAX_HEALTH, pet.health + 20);
        emit PetFed(msg.sender, pet.health, pet.xp);
        emit ItemPurchasedWithUSDC(msg.sender, "FOOD", price);
    }

    // Full Health — base $0.25 USDC (discount applied if active)
    function buySuperFoodWithUSDC() public {
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        require(pet.health > 0, "Pet is dead");
        uint256 price = _discountedPrice(PRICE_SUPER_FOOD_USDC);
        _splitPaymentUSDC(price);
        pet.health = MAX_HEALTH;
        emit PetFed(msg.sender, pet.health, pet.xp);
        emit ItemPurchasedWithUSDC(msg.sender, "SUPER_FOOD", price);
    }

    // 2x XP for 24h — base $0.20 USDC (discount applied if active)
    function buyEnergyDrinkWithUSDC() public {
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        uint256 price = _discountedPrice(PRICE_ENERGY_DRINK_USDC);
        _splitPaymentUSDC(price);
        if (pet.boostEndTime < block.timestamp) {
            pet.boostEndTime = block.timestamp + 24 hours;
        } else {
            pet.boostEndTime += 24 hours;
        }
        emit BoostActivated(msg.sender, pet.boostEndTime);
        emit ItemPurchasedWithUSDC(msg.sender, "ENERGY_DRINK", price);
    }

    // +1 Streak Shield — base $0.50 USDC (discount applied if active)
    function buyShieldWithUSDC() public {
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        uint256 price = _discountedPrice(PRICE_SHIELD_USDC);
        _splitPaymentUSDC(price);
        pet.shieldCount += 1;
        emit ShieldAdded(msg.sender, pet.shieldCount);
        emit ItemPurchasedWithUSDC(msg.sender, "SHIELD", price);
    }

    // Revive dead pet — base $0.25 USDC (discount applied if active)
    function revivePetWithUSDC() public {
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        require(pet.health == 0, "Pet is alive");
        uint256 price = _discountedPrice(PRICE_REVIVE_USDC);
        _splitPaymentUSDC(price);
        pet.health = 50;
        pet.lastInteraction = block.timestamp;
        emit PetFed(msg.sender, pet.health, pet.xp);
        emit ItemPurchasedWithUSDC(msg.sender, "REVIVE", price);
    }

    // Buy cosmetic with USDC. usdcPrice must be in USDC units (6 decimals).
    // Frontend is responsible for passing the correct price matching the item.
    function buyCosmeticWithUSDC(string memory cosmeticId, uint256 usdcPrice) public {
        require(usdcPrice > 0, "Invalid price");
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        _splitPaymentUSDC(usdcPrice);
        ownedCosmetics[msg.sender][cosmeticId] = true;
        isCosmeticEquipped[msg.sender][cosmeticId] = true;
        emit ItemPurchasedWithUSDC(msg.sender, cosmeticId, usdcPrice);
    }

    // ── NIM buy functions ─────────────────────────────────────────────────────
    // Self-service: the caller pays NIM directly to the treasury's Nimiq
    // address via the Nimiq provider (sendBasicTransaction), then calls the
    // matching function below themselves with the resulting tx hash. There is
    // no relayer and no owner gate — see usedNimTx above for what nimTxHash
    // actually protects against.

    function _consumeNimTx(bytes32 nimTxHash) internal {
        require(nimTxHash != bytes32(0), "Focusling: invalid tx hash");
        require(!usedNimTx[nimTxHash], "Focusling: NIM tx already used");
        usedNimTx[nimTxHash] = true;
    }

    // +20 Health — 5 NIM
    function buyFoodWithNIM(bytes32 nimTxHash) public {
        _consumeNimTx(nimTxHash);
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        require(pet.health > 0, "Pet is dead");
        pet.health = min(MAX_HEALTH, pet.health + 20);
        totalVolumeNIM += PRICE_FOOD_NIM;
        emit PetFed(msg.sender, pet.health, pet.xp);
        emit ItemPurchasedWithNIM(msg.sender, "FOOD", PRICE_FOOD_NIM, nimTxHash);
    }

    // Full Health — 12 NIM
    function buySuperFoodWithNIM(bytes32 nimTxHash) public {
        _consumeNimTx(nimTxHash);
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        require(pet.health > 0, "Pet is dead");
        pet.health = MAX_HEALTH;
        totalVolumeNIM += PRICE_SUPER_FOOD_NIM;
        emit PetFed(msg.sender, pet.health, pet.xp);
        emit ItemPurchasedWithNIM(msg.sender, "SUPER_FOOD", PRICE_SUPER_FOOD_NIM, nimTxHash);
    }

    // 2x XP for 24h — 10 NIM
    function buyEnergyDrinkWithNIM(bytes32 nimTxHash) public {
        _consumeNimTx(nimTxHash);
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        if (pet.boostEndTime < block.timestamp) {
            pet.boostEndTime = block.timestamp + 24 hours;
        } else {
            pet.boostEndTime += 24 hours;
        }
        totalVolumeNIM += PRICE_ENERGY_DRINK_NIM;
        emit BoostActivated(msg.sender, pet.boostEndTime);
        emit ItemPurchasedWithNIM(msg.sender, "ENERGY_DRINK", PRICE_ENERGY_DRINK_NIM, nimTxHash);
    }

    // +1 Streak Shield — 25 NIM
    function buyShieldWithNIM(bytes32 nimTxHash) public {
        _consumeNimTx(nimTxHash);
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        pet.shieldCount += 1;
        totalVolumeNIM += PRICE_SHIELD_NIM;
        emit ShieldAdded(msg.sender, pet.shieldCount);
        emit ItemPurchasedWithNIM(msg.sender, "SHIELD", PRICE_SHIELD_NIM, nimTxHash);
    }

    // Revive dead pet — 12 NIM
    function revivePetWithNIM(bytes32 nimTxHash) public {
        _consumeNimTx(nimTxHash);
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        Pet storage pet = pets[msg.sender];
        require(pet.health == 0, "Pet is alive");
        pet.health = 50;
        pet.lastInteraction = block.timestamp;
        totalVolumeNIM += PRICE_REVIVE_NIM;
        emit PetFed(msg.sender, pet.health, pet.xp);
        emit ItemPurchasedWithNIM(msg.sender, "REVIVE", PRICE_REVIVE_NIM, nimTxHash);
    }

    // Buy cosmetic with NIM. nimAmountLuna must be in Luna (1 NIM = 100,000 Luna).
    // Frontend is responsible for passing the correct price matching the item.
    function buyCosmeticWithNIM(string memory cosmeticId, uint256 nimAmountLuna, bytes32 nimTxHash) public {
        require(nimAmountLuna > 0, "Invalid price");
        _consumeNimTx(nimTxHash);
        if (pets[msg.sender].birthTime == 0) _initPet(msg.sender);
        ownedCosmetics[msg.sender][cosmeticId] = true;
        isCosmeticEquipped[msg.sender][cosmeticId] = true;
        totalVolumeNIM += nimAmountLuna;
        emit ItemPurchasedWithNIM(msg.sender, cosmeticId, nimAmountLuna, nimTxHash);
    }

    // ── Cosmetic toggle ────────────────────────────────────────────────────────

    function toggleCosmetic(string memory cosmeticId) public hasPet {
        _settleUser(msg.sender);
        require(ownedCosmetics[msg.sender][cosmeticId], "Item not owned");
        isCosmeticEquipped[msg.sender][cosmeticId] = !isCosmeticEquipped[msg.sender][cosmeticId];
        emit ItemPurchasedWithUSDC(msg.sender, cosmeticId, 0);
    }

    // ── Focus session ──────────────────────────────────────────────────────────

    function focusSession(uint256 sessionDurationSeconds) public {
        Pet storage pet = pets[msg.sender];
        if (pet.birthTime == 0) _initPet(msg.sender);

        uint256 xpBefore = pet.xp;
        _settlePet(pet);
        _updateStreak(pet);
        _awardRewards(pet, sessionDurationSeconds);

        totalFocusSessions += 1;

        emit FocusSessionRecorded(
            msg.sender,
            sessionDurationSeconds,
            pet.xp - xpBefore,
            pet.totalFocusTime,
            pet.streak,
            pet.health
        );
        emit PetFed(msg.sender, pet.health, pet.xp);
    }

    // ── Names / user management ───────────────────────────────────────────────

    function setNames(string memory _username, string memory _petName) public hasPet {
        if (bytes(_username).length > 0) {
            address existing = usernameToAddress[_username];
            require(existing == address(0) || existing == msg.sender, "Username taken");

            string memory oldUsername = pets[msg.sender].username;
            if (bytes(oldUsername).length > 0 && keccak256(bytes(oldUsername)) != keccak256(bytes(_username))) {
                delete usernameToAddress[oldUsername];
            }

            usernameToAddress[_username] = msg.sender;
        }

        pets[msg.sender].username = _username;
        pets[msg.sender].petName = _petName;
        emit NamesUpdated(msg.sender, _username, _petName);
    }

    function deleteUser() public {
        _clearUserData(msg.sender);
    }

    function adminDeleteUser(address _user) public onlyOwner {
        _clearUserData(_user);
    }

    function _clearUserData(address _user) internal {
        string memory username = pets[_user].username;
        if (bytes(username).length > 0) {
            delete usernameToAddress[username];
        }

        ownedCosmetics[_user]["sunglasses"] = false;
        ownedCosmetics[_user]["crown"] = false;
        isCosmeticEquipped[_user]["sunglasses"] = false;
        isCosmeticEquipped[_user]["crown"] = false;

        delete pets[_user];

        if (totalUsers > 0) {
            totalUsers -= 1;
        }

        emit UserDeleted(_user);
    }

    // ── Pet migration ─────────────────────────────────────────────────────────
    // Moves all pet data (XP, health, streak, cosmetics, username) from the
    // caller's address to newAddress. newAddress must be empty — we will never
    // silently overwrite an existing player's data.
    //
    // What is NOT migrated:
    //   • USDC balance/allowance — user must transfer/re-approve on newAddress
    //
    // totalUsers is intentionally unchanged — we are moving one pet, not
    // creating or deleting one. We do NOT call _clearUserData() because that
    // function decrements totalUsers and emits UserDeleted.
    function migratePet(address newAddress) external hasPet {
        require(newAddress != address(0), "Invalid address");
        require(newAddress != msg.sender, "Cannot migrate to same address");
        require(pets[newAddress].birthTime == 0, "Target already has a pet");

        _executeMigration(msg.sender, newAddress);
    }

    // Owner-callable version for users whose wallet has no gas funds on the
    // new address yet. User contacts support, proves ownership of both
    // addresses off-chain, and the owner executes on their behalf.
    function adminMigratePet(address from, address to) external onlyOwner {
        require(from != address(0) && to != address(0), "Invalid address");
        require(from != to, "Addresses must differ");
        require(pets[from].birthTime > 0, "Source has no pet");
        require(pets[to].birthTime == 0, "Target already has a pet");

        _executeMigration(from, to);
    }

    function _executeMigration(address from, address to) internal {
        string memory uname = pets[from].username;
        if (bytes(uname).length > 0) {
            usernameToAddress[uname] = to;
        }

        pets[to] = pets[from];

        if (ownedCosmetics[from]["sunglasses"]) ownedCosmetics[to]["sunglasses"] = true;
        if (ownedCosmetics[from]["crown"])       ownedCosmetics[to]["crown"]       = true;
        if (isCosmeticEquipped[from]["sunglasses"]) isCosmeticEquipped[to]["sunglasses"] = true;
        if (isCosmeticEquipped[from]["crown"])       isCosmeticEquipped[to]["crown"]       = true;

        delete pets[from];
        ownedCosmetics[from]["sunglasses"] = false;
        ownedCosmetics[from]["crown"]      = false;
        isCosmeticEquipped[from]["sunglasses"] = false;
        isCosmeticEquipped[from]["crown"]      = false;

        emit PetMigrated(from, to);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getPet(address owner) public view returns (Pet memory) {
        return pets[owner];
    }

    // ── Storage variables ────────────────────────────────────────────────────

    mapping(address => mapping(string => bool)) public ownedCosmetics;
    mapping(address => mapping(string => bool)) public isCosmeticEquipped;
    uint256 public totalUsers;
    uint256 public totalFocusSessions;
    uint256 public totalGlobalFocusTime;
    address public treasury;
    mapping(string => address) public usernameToAddress;
    uint256 public totalVolumeUSDC;
    uint256 public totalVolumeNIM;

    // Launch discount (auto-expires at discountEndTime)
    uint256 public discountBps;      // e.g. 3000 = 30% off; 0 = no discount
    uint256 public discountEndTime;  // Unix timestamp; discount inactive after this

    // ── Utilities ─────────────────────────────────────────────────────────────

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
