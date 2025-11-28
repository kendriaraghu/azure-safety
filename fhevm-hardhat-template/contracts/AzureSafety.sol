// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Azure Safety - Construction Site Encrypted Safety Score System
/// @author Azure Safety Team
/// @notice A FHEVM-based system for managing encrypted safety scores on construction sites
contract AzureSafety is SepoliaConfig {
    enum EventType {
        SafetyEquipmentCheck,
        Violation,
        Inspection
    }

    struct SafetyEvent {
        EventType eventType;
        euint32 scoreChange;
        uint256 timestamp;
        address reporter;
        bool exists;
    }

    mapping(address => euint32) private _userScores;
    mapping(address => uint256[]) private _userEventIds;
    mapping(uint256 => SafetyEvent) private _events;
    uint256 private _eventCounter;

    euint32 private _globalThreshold;
    mapping(uint256 => euint32) private _segmentThresholds;
    uint256 private _segmentCounter;

    mapping(address => bool) private _authorizedAdmins;
    address[] private _adminList;

    mapping(address => uint256) private _userSegmentId;
    mapping(uint256 => address[]) private _segmentUsers;
    mapping(uint256 => euint32) private _segmentScores;
    event EventReported(address indexed reporter, uint256 indexed eventId, EventType eventType);
    event ScoreUpdated(address indexed user, uint256 indexed eventId);
    event ThresholdSet(uint256 indexed segmentId, bool isGlobal);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event PenaltyApplied(address indexed user, uint256 amount);
    event AggregateCalculated(address indexed caller, bytes32 indexed aggregateHandle, uint256[] segmentIds);

    constructor(address[] memory initialAdmins) {
        for (uint256 i = 0; i < initialAdmins.length; i++) {
            _authorizedAdmins[initialAdmins[i]] = true;
            _adminList.push(initialAdmins[i]);
        }
    }

    /// @notice Report a safety event with encrypted score change
    /// @param eventType The type of event (SafetyEquipmentCheck, Violation, Inspection)
    /// @param encryptedScoreChange The encrypted score change value (positive for bonus, negative for penalty)
    /// @param inputProof The input proof for the encrypted value
    /// @return eventId The ID of the reported event
    function reportEvent(
        EventType eventType,
        externalEuint32 encryptedScoreChange,
        bytes calldata inputProof
    ) external returns (uint256) {
        euint32 scoreChange = FHE.fromExternal(encryptedScoreChange, inputProof);

        uint256 eventId = _eventCounter++;
        _events[eventId] = SafetyEvent({
            eventType: eventType,
            scoreChange: scoreChange,
            timestamp: block.timestamp,
            reporter: msg.sender,
            exists: true
        });

        _userEventIds[msg.sender].push(eventId);

        euint32 currentScore = _userScores[msg.sender];
        euint32 newScore = FHE.add(currentScore, scoreChange);
        _userScores[msg.sender] = newScore;

        FHE.allowThis(newScore);
        FHE.allow(newScore, msg.sender);
        FHE.allow(scoreChange, msg.sender);
        for (uint256 i = 0; i < _adminList.length; i++) {
            FHE.allow(newScore, _adminList[i]);
            FHE.allow(scoreChange, _adminList[i]);
        }

        uint256 segmentId = _userSegmentId[msg.sender];
        if (segmentId > 0) {
            euint32 segmentScore = _segmentScores[segmentId];
            _segmentScores[segmentId] = FHE.add(segmentScore, scoreChange);
            FHE.allowThis(_segmentScores[segmentId]);
        }

        emit EventReported(msg.sender, eventId, eventType);
        emit ScoreUpdated(msg.sender, eventId);

        return eventId;
    }

    /// @notice Get the current encrypted safety score for a user
    /// @param user The address of the user
    /// @return The encrypted safety score (returns uninitialized bytes32(0) if not set)
    function getCurrentScore(address user) external view returns (euint32) {
        return _userScores[user];
    }

    /// @notice Get event details by ID
    /// @param eventId The event ID
    /// @return eventType The event type
    /// @return scoreChange The encrypted score change
    /// @return timestamp The event timestamp
    /// @return reporter The reporter address
    function getEvent(uint256 eventId) external view returns (
        EventType eventType,
        euint32 scoreChange,
        uint256 timestamp,
        address reporter
    ) {
        require(_events[eventId].exists, "Event does not exist");
        SafetyEvent memory evt = _events[eventId];
        return (evt.eventType, evt.scoreChange, evt.timestamp, evt.reporter);
    }

    /// @notice Get event IDs for a user
    /// @param user The user address
    /// @return Array of event IDs
    function getUserEventIds(address user) external view returns (uint256[] memory) {
        return _userEventIds[user];
    }

    /// @notice Set global threshold (only authorized admins)
    /// @param encryptedThreshold The encrypted threshold value
    /// @param inputProof The input proof
    function setGlobalThreshold(
        externalEuint32 encryptedThreshold,
        bytes calldata inputProof
    ) external {
        require(_authorizedAdmins[msg.sender], "Not authorized");
        _globalThreshold = FHE.fromExternal(encryptedThreshold, inputProof);
        FHE.allowThis(_globalThreshold);
        FHE.allow(_globalThreshold, msg.sender);
        for (uint256 i = 0; i < _adminList.length; i++) {
            FHE.allow(_globalThreshold, _adminList[i]);
        }
        emit ThresholdSet(0, true);
    }

    /// @notice Set segment threshold (only authorized admins)
    /// @param segmentId The segment ID
    /// @param encryptedThreshold The encrypted threshold value
    /// @param inputProof The input proof
    function setSegmentThreshold(
        uint256 segmentId,
        externalEuint32 encryptedThreshold,
        bytes calldata inputProof
    ) external {
        require(_authorizedAdmins[msg.sender], "Not authorized");
        require(segmentId > 0, "Invalid segment ID");
        _segmentThresholds[segmentId] = FHE.fromExternal(encryptedThreshold, inputProof);
        FHE.allowThis(_segmentThresholds[segmentId]);
        FHE.allow(_segmentThresholds[segmentId], msg.sender);
        for (uint256 i = 0; i < _adminList.length; i++) {
            FHE.allow(_segmentThresholds[segmentId], _adminList[i]);
        }
        emit ThresholdSet(segmentId, false);
    }

    /// @notice Get global threshold
    /// @return The encrypted global threshold
    function getGlobalThreshold() external view returns (euint32) {
        return _globalThreshold;
    }

    /// @notice Get segment threshold
    /// @param segmentId The segment ID
    /// @return The encrypted segment threshold
    function getSegmentThreshold(uint256 segmentId) external view returns (euint32) {
        return _segmentThresholds[segmentId];
    }

    /// @notice Check if user score is below threshold (encrypted comparison)
    /// @param user The user address
    /// @param useGlobal Whether to use global threshold (true) or segment threshold (false)
    /// @return isBelow The encrypted boolean result
    function checkThreshold(address user, bool useGlobal) external returns (ebool) {
        euint32 score = _userScores[user];
        FHE.allowThis(score);

        euint32 threshold;
        if (useGlobal) {
            threshold = _globalThreshold;
        } else {
            uint256 segmentId = _userSegmentId[user];
            require(segmentId > 0, "User not assigned to segment");
            threshold = _segmentThresholds[segmentId];
        }

        FHE.allowThis(threshold);
        ebool result = FHE.lt(score, threshold);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        for (uint256 i = 0; i < _adminList.length; i++) {
            FHE.allow(result, _adminList[i]);
        }
        return result;
    }

    /// @notice Apply penalty when score is below threshold (only authorized admins)
    /// @param user The user address
    /// @param encryptedPenalty The encrypted penalty amount
    /// @param inputProof The input proof
    function applyPenalty(
        address user,
        externalEuint32 encryptedPenalty,
        bytes calldata inputProof
    ) external {
        require(_authorizedAdmins[msg.sender], "Not authorized");
        euint32 penalty = FHE.fromExternal(encryptedPenalty, inputProof);
        
        euint32 currentScore = _userScores[user];
        FHE.allowThis(currentScore);
        euint32 newScore = FHE.sub(currentScore, penalty);
        _userScores[user] = newScore;

        FHE.allowThis(newScore);
        FHE.allow(newScore, user);
        FHE.allow(penalty, msg.sender);
        for (uint256 i = 0; i < _adminList.length; i++) {
            FHE.allow(newScore, _adminList[i]);
        }

        emit PenaltyApplied(user, 0);
        emit ScoreUpdated(user, 0);
    }

    /// @notice Aggregate scores for multiple segments
    /// @param segmentIds Array of segment IDs to aggregate
    /// @return aggregateScore The encrypted aggregate score
    function aggregateScores(uint256[] calldata segmentIds) external returns (euint32) {
        require(segmentIds.length > 0, "No segments provided");
        
        euint32 aggregate = FHE.asEuint32(0);
        FHE.allowThis(aggregate);
        
        for (uint256 i = 0; i < segmentIds.length; i++) {
            uint256 segmentId = segmentIds[i];
            euint32 segmentScore = _segmentScores[segmentId];
            aggregate = FHE.add(aggregate, segmentScore);
            FHE.allowThis(aggregate);
        }

        for (uint256 i = 0; i < _adminList.length; i++) {
            FHE.allow(aggregate, _adminList[i]);
        }

        bytes32 aggregateHandle;
        assembly {
            aggregateHandle := aggregate
        }
        emit AggregateCalculated(msg.sender, aggregateHandle, segmentIds);

        return aggregate;
    }

    /// @notice Assign user to a segment (only authorized admins)
    /// @param user The user address
    /// @param segmentId The segment ID (0 to unassign)
    function assignUserToSegment(address user, uint256 segmentId) external {
        require(_authorizedAdmins[msg.sender], "Not authorized");
        
        uint256 oldSegmentId = _userSegmentId[user];
        if (oldSegmentId > 0) {
            address[] storage oldUsers = _segmentUsers[oldSegmentId];
            for (uint256 i = 0; i < oldUsers.length; i++) {
                if (oldUsers[i] == user) {
                    oldUsers[i] = oldUsers[oldUsers.length - 1];
                    oldUsers.pop();
                    break;
                }
            }
        }

        if (segmentId > 0) {
            _userSegmentId[user] = segmentId;
            _segmentUsers[segmentId].push(user);
        } else {
            delete _userSegmentId[user];
        }
    }

    /// @notice Get segment score
    /// @param segmentId The segment ID
    /// @return The encrypted segment score (returns uninitialized bytes32(0) if not set)
    function getSegmentScore(uint256 segmentId) external view returns (euint32) {
        return _segmentScores[segmentId];
    }

    /// @notice Get user's assigned segment ID
    /// @param user The user address
    /// @return The segment ID (0 if not assigned)
    function getUserSegmentId(address user) external view returns (uint256) {
        return _userSegmentId[user];
    }

    /// @notice Add authorized admin (only existing admins)
    /// @param admin The admin address to add
    function addAuthorizedAdmin(address admin) external {
        require(_authorizedAdmins[msg.sender], "Not authorized");
        require(!_authorizedAdmins[admin], "Already authorized");
        _authorizedAdmins[admin] = true;
        _adminList.push(admin);
        emit AdminAdded(admin);
    }

    /// @notice Remove authorized admin (only existing admins)
    /// @param admin The admin address to remove
    function removeAuthorizedAdmin(address admin) external {
        require(_authorizedAdmins[msg.sender], "Not authorized");
        require(_authorizedAdmins[admin], "Not an admin");
        require(admin != msg.sender, "Cannot remove yourself");
        _authorizedAdmins[admin] = false;
        
        for (uint256 i = 0; i < _adminList.length; i++) {
            if (_adminList[i] == admin) {
                _adminList[i] = _adminList[_adminList.length - 1];
                _adminList.pop();
                break;
            }
        }
        emit AdminRemoved(admin);
    }

    /// @notice Check if address is authorized admin
    /// @param admin The address to check
    /// @return True if authorized
    function isAuthorizedAdmin(address admin) external view returns (bool) {
        return _authorizedAdmins[admin];
    }

    /// @notice Get all authorized admins
    /// @return Array of admin addresses
    function getAuthorizedAdmins() external view returns (address[] memory) {
        return _adminList;
    }
}

