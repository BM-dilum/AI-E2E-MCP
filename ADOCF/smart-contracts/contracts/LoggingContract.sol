// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract LoggingContract {
    address public owner;

    struct ToolCall {
        string name;
        string args;
        string result;
    }

    struct LogEntry {
        string userRequest;
        string response;
        ToolCall[] toolCalls;
    }

    struct SessionDataEntry {
        LogEntry[] logs;
        string txHash;
    }

    struct SessionRecord {
        string sessionID;
        string txHash;
    }

    mapping(string => SessionDataEntry) private sessionData;
    mapping(string => uint256) private sessionRecordIndexPlusOne;
    SessionRecord[] private sessionRecords;

    uint256 public constant DEFAULT_PAGE_SIZE = 10;
    uint256 public constant MAX_PAGE_SIZE = 100;

    event LogsUploaded(string indexed sessionID, string txHash);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "LoggingContract: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LoggingContract: new owner is the zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory txHash
    ) external onlyOwner {
        require(bytes(sessionID).length != 0, "LoggingContract: empty sessionID");

        SessionDataEntry storage entry = sessionData[sessionID];

        delete entry.logs;

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry memory sourceLog = logEntries[i];
            ToolCall[] memory sourceToolCalls = sourceLog.toolCalls;

            entry.logs.push();
            LogEntry storage storedLog = entry.logs[entry.logs.length - 1];
            storedLog.userRequest = sourceLog.userRequest;
            storedLog.response = sourceLog.response;

            for (uint256 j = 0; j < sourceToolCalls.length; j++) {
                storedLog.toolCalls.push();
                ToolCall storage storedToolCall = storedLog.toolCalls[storedLog.toolCalls.length - 1];
                storedToolCall.name = sourceToolCalls[j].name;
                storedToolCall.args = sourceToolCalls[j].args;
                storedToolCall.result = sourceToolCalls[j].result;
            }
        }

        entry.txHash = txHash;

        uint256 recordIndexPlusOne = sessionRecordIndexPlusOne[sessionID];
        if (recordIndexPlusOne == 0) {
            sessionRecords.push(SessionRecord({sessionID: sessionID, txHash: txHash}));
            sessionRecordIndexPlusOne[sessionID] = sessionRecords.length;
        } else {
            sessionRecords[recordIndexPlusOne - 1].txHash = txHash;
        }

        emit LogsUploaded(sessionID, txHash);
    }

    function getLogs(uint256 page, uint256 pageSize)
        external
        view
        returns (SessionDataEntry[] memory, uint256 totalPages)
    {
        uint256 effectivePageSize = pageSize == 0 ? DEFAULT_PAGE_SIZE : pageSize;
        require(effectivePageSize > 0, "LoggingContract: page size must be greater than zero");
        require(effectivePageSize <= MAX_PAGE_SIZE, "LoggingContract: page size exceeds maximum");

        uint256 totalSessions = sessionRecords.length;

        if (totalSessions == 0) {
            return (new SessionDataEntry[](0), 0);
        }

        totalPages = (totalSessions + effectivePageSize - 1) / effectivePageSize;

        if (page == 0 || page > totalPages) {
            return (new SessionDataEntry[](0), totalPages);
        }

        uint256 startIndex = totalSessions - ((page - 1) * effectivePageSize);
        uint256 endExclusive = startIndex > effectivePageSize ? startIndex - effectivePageSize : 0;
        uint256 resultLength = startIndex - endExclusive;

        SessionDataEntry[] memory results = new SessionDataEntry[](resultLength);

        uint256 resultIndex = 0;
        for (uint256 i = startIndex; i > endExclusive; i--) {
            string memory sessionID = sessionRecords[i - 1].sessionID;
            SessionDataEntry storage storedEntry = sessionData[sessionID];

            SessionDataEntry memory copiedEntry;
            copiedEntry.txHash = storedEntry.txHash;
            copiedEntry.logs = new LogEntry[](storedEntry.logs.length);

            for (uint256 j = 0; j < storedEntry.logs.length; j++) {
                LogEntry storage storedLog = storedEntry.logs[j];
                copiedEntry.logs[j].userRequest = storedLog.userRequest;
                copiedEntry.logs[j].response = storedLog.response;
                copiedEntry.logs[j].toolCalls = new ToolCall[](storedLog.toolCalls.length);

                for (uint256 k = 0; k < storedLog.toolCalls.length; k++) {
                    ToolCall storage storedToolCall = storedLog.toolCalls[k];
                    copiedEntry.logs[j].toolCalls[k].name = storedToolCall.name;
                    copiedEntry.logs[j].toolCalls[k].args = storedToolCall.args;
                    copiedEntry.logs[j].toolCalls[k].result = storedToolCall.result;
                }
            }

            results[resultIndex] = copiedEntry;
            resultIndex++;
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view returns (string[] memory) {
        uint256 totalSessions = sessionRecords.length;
        string[] memory ids = new string[](totalSessions);

        for (uint256 i = 0; i < totalSessions; i++) {
            ids[i] = sessionRecords[i].sessionID;
        }

        return ids;
    }
}