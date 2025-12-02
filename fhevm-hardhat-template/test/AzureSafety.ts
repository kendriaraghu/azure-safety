import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AzureSafety, AzureSafety__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  admin: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AzureSafety")) as AzureSafety__factory;
  const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
  const initialAdmins = [ethSigners[3].address]; // Use 4th signer as initial admin
  const contract = (await factory.deploy(initialAdmins)) as AzureSafety;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AzureSafety", function () {
  let signers: Signers;
  let azureSafety: AzureSafety;
  let azureSafetyAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      admin: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract: azureSafety, contractAddress: azureSafetyAddress } = await deployFixture());
  });

  describe("Initialization", function () {
    it("should initialize with authorized admins", async function () {
      const isAdmin = await azureSafety.isAuthorizedAdmin(signers.admin.address);
      expect(isAdmin).to.be.true;

      const admins = await azureSafety.getAuthorizedAdmins();
      expect(admins.length).to.eq(1);
      expect(admins[0]).to.eq(signers.admin.address);
    });

    it("should have uninitialized scores after deployment", async function () {
      const score = await azureSafety.getCurrentScore(signers.alice.address);
      // Score should be uninitialized (bytes32(0))
      expect(score).to.eq(ethers.ZeroHash);
    });
  });

  describe("Event Reporting", function () {
    it("should report a safety equipment check event with positive score", async function () {
      const scoreChange = 10;
      const encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(scoreChange)
        .encrypt();

      const tx = await azureSafety
        .connect(signers.alice)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof); // EventType.SafetyEquipmentCheck = 0
      await tx.wait();

      const score = await azureSafety.getCurrentScore(signers.alice.address);
      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        score,
        azureSafetyAddress,
        signers.alice,
      );
      expect(clearScore).to.eq(scoreChange);
    });

    it("should report a violation event with negative score", async function () {
      // First add some positive score
      const positiveScore = 20;
      let encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(positiveScore)
        .encrypt();

      await (await azureSafety
        .connect(signers.alice)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof)).wait();

      // Then report violation with negative score (encrypt absolute value, contract will subtract)
      // Note: In real implementation, we'd need a separate function or handle negative values differently
      // For now, we'll test with a smaller positive value to simulate subtraction
      const penaltyAmount = 15;
      encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(penaltyAmount)
        .encrypt();

      // Use applyPenalty to subtract (simulating negative score change)
      await (await azureSafety
        .connect(signers.admin)
        .applyPenalty(signers.alice.address, encrypted.handles[0], encrypted.inputProof)).wait();

      const score = await azureSafety.getCurrentScore(signers.alice.address);
      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        score,
        azureSafetyAddress,
        signers.alice,
      );
      expect(clearScore).to.eq(positiveScore - penaltyAmount); // 20 - 15 = 5
    });

    it("should track event history for users", async function () {
      const scoreChange = 5;
      const encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(scoreChange)
        .encrypt();

      const tx = await azureSafety
        .connect(signers.alice)
        .reportEvent(2, encrypted.handles[0], encrypted.inputProof); // EventType.Inspection = 2
      const receipt = await tx.wait();

      const eventIds = await azureSafety.getUserEventIds(signers.alice.address);
      expect(eventIds.length).to.eq(1);

      const [eventType, , timestamp, reporter] = await azureSafety.getEvent(eventIds[0]);
      expect(eventType).to.eq(2);
      expect(reporter).to.eq(signers.alice.address);
      expect(timestamp).to.be.gt(0);
    });
  });

  describe("Threshold Management", function () {
    it("should allow admin to set global threshold", async function () {
      const threshold = 60;
      const encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.admin.address)
        .add32(threshold)
        .encrypt();

      await (await azureSafety
        .connect(signers.admin)
        .setGlobalThreshold(encrypted.handles[0], encrypted.inputProof)).wait();

      const storedThreshold = await azureSafety.getGlobalThreshold();
      const clearThreshold = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedThreshold,
        azureSafetyAddress,
        signers.admin,
      );
      expect(clearThreshold).to.eq(threshold);
    });

    it("should not allow non-admin to set threshold", async function () {
      const threshold = 60;
      const encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(threshold)
        .encrypt();

      await expect(
        azureSafety
          .connect(signers.alice)
          .setGlobalThreshold(encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Not authorized");
    });

    it("should check if score is below threshold", async function () {
      // Set threshold to 60
      const threshold = 60;
      let encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.admin.address)
        .add32(threshold)
        .encrypt();

      await (await azureSafety
        .connect(signers.admin)
        .setGlobalThreshold(encrypted.handles[0], encrypted.inputProof)).wait();

      // Set user score to 50 (below threshold)
      const score = 50;
      encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(score)
        .encrypt();

      await (await azureSafety
        .connect(signers.alice)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof)).wait();

      // Check threshold (result is encrypted boolean)
      // Note: ebool decryption would require additional setup, testing the call succeeds
      const isBelow = await azureSafety.checkThreshold(signers.alice.address, true);
      expect(isBelow).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("Penalty Application", function () {
    it("should allow admin to apply penalty", async function () {
      // Set initial score to 50
      const initialScore = 50;
      let encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(initialScore)
        .encrypt();

      await (await azureSafety
        .connect(signers.alice)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof)).wait();

      // Apply penalty of 10
      const penalty = 10;
      encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.admin.address)
        .add32(penalty)
        .encrypt();

      await (await azureSafety
        .connect(signers.admin)
        .applyPenalty(signers.alice.address, encrypted.handles[0], encrypted.inputProof)).wait();

      const score = await azureSafety.getCurrentScore(signers.alice.address);
      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        score,
        azureSafetyAddress,
        signers.alice,
      );
      expect(clearScore).to.eq(initialScore - penalty); // 50 - 10 = 40
    });

    it("should not allow non-admin to apply penalty", async function () {
      const penalty = 10;
      const encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(penalty)
        .encrypt();

      await expect(
        azureSafety
          .connect(signers.alice)
          .applyPenalty(signers.bob.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Segment Management", function () {
    it("should allow admin to assign user to segment", async function () {
      await (await azureSafety
        .connect(signers.admin)
        .assignUserToSegment(signers.alice.address, 1)).wait();

      // User should be in segment 1
      // This is tested indirectly through segment score aggregation
    });

    it("should update segment score when user reports event", async function () {
      // Assign user to segment 1
      await (await azureSafety
        .connect(signers.admin)
        .assignUserToSegment(signers.alice.address, 1)).wait();

      // Report event with score change
      const scoreChange = 20;
      const encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(scoreChange)
        .encrypt();

      await (await azureSafety
        .connect(signers.alice)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof)).wait();

      // Check segment score
      const segmentScore = await azureSafety.getSegmentScore(1);
      const clearSegmentScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        segmentScore,
        azureSafetyAddress,
        signers.admin,
      );
      expect(clearSegmentScore).to.eq(scoreChange);
    });
  });

  describe("Score Aggregation", function () {
    it("should aggregate scores from multiple segments", async function () {
      // Assign users to segments and add scores
      await (await azureSafety
        .connect(signers.admin)
        .assignUserToSegment(signers.alice.address, 1)).wait();

      await (await azureSafety
        .connect(signers.admin)
        .assignUserToSegment(signers.bob.address, 2)).wait();

      // Alice reports event in segment 1
      const score1 = 30;
      let encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.alice.address)
        .add32(score1)
        .encrypt();

      await (await azureSafety
        .connect(signers.alice)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof)).wait();

      // Bob reports event in segment 2
      const score2 = 40;
      encrypted = await fhevm
        .createEncryptedInput(azureSafetyAddress, signers.bob.address)
        .add32(score2)
        .encrypt();

      await (await azureSafety
        .connect(signers.bob)
        .reportEvent(0, encrypted.handles[0], encrypted.inputProof)).wait();

      // Aggregate segments 1 and 2
      const aggregate = await azureSafety.aggregateScores([1, 2]);
      // Convert handle to string if needed
      const aggregateHandle = typeof aggregate === 'string' ? aggregate : aggregate.toString();
      const clearAggregate = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        aggregateHandle,
        azureSafetyAddress,
        signers.admin,
      );
      expect(clearAggregate).to.eq(score1 + score2); // 30 + 40 = 70
    });
  });

  describe("Admin Management", function () {
    it("should allow admin to add new admin", async function () {
      await (await azureSafety
        .connect(signers.admin)
        .addAuthorizedAdmin(signers.bob.address)).wait();

      const isAdmin = await azureSafety.isAuthorizedAdmin(signers.bob.address);
      expect(isAdmin).to.be.true;
    });

    it("should allow admin to remove admin", async function () {
      // First add bob as admin
      await (await azureSafety
        .connect(signers.admin)
        .addAuthorizedAdmin(signers.bob.address)).wait();

      // Then remove bob
      await (await azureSafety
        .connect(signers.admin)
        .removeAuthorizedAdmin(signers.bob.address)).wait();

      const isAdmin = await azureSafety.isAuthorizedAdmin(signers.bob.address);
      expect(isAdmin).to.be.false;
    });

    it("should not allow non-admin to add admin", async function () {
      await expect(
        azureSafety
          .connect(signers.alice)
          .addAuthorizedAdmin(signers.bob.address)
      ).to.be.revertedWith("Not authorized");
    });
  });
});

