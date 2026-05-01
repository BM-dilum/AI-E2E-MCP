// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract LoggingContract {
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

    uint256 public constant DEFAULT_PAGE_SIZE = 10;

    address public owner;

    mapping(string => SessionDataEntry) private sessionData;
    mapping(string => bool) private sessionExists;
    string[] private sessionIDs;

    event LogsUploaded(string indexed sessionID, LogEntry[] logEntries, string txHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory txHash
    ) external onlyOwner {
        bool isNewSession = !sessionExists[sessionID];

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
                ToolCall memory sourceToolCall = sourceToolCalls[j];
                storedLog.toolCalls.push();
                ToolCall storage storedToolCall = storedLog.toolCalls[storedLog.toolCalls.length - 1];
                storedToolCall.name = sourceToolCall.name;
                storedToolCall.args = sourceToolCall.args;
                storedToolCall.result = sourceToolCall.result;
            }
        }

        entry.txHash = txHash;

        if (isNewSession) {
            sessionExists[sessionID] = true;
            sessionIDs.push(sessionID);
        }

        emit LogsUploaded(sessionID, logEntries, txHash);
    }

    function getLogs(
        uint256 page,
        uint256 pageSize
    ) external view returns (SessionDataEntry[] memory, uint256 totalPages) {
        uint256 effectivePageSize = pageSize == 0 ? DEFAULT_PAGE_SIZE : pageSize;
        uint256 totalSessions = sessionIDs.length;

        if (totalSessions == 0) {
            return (new SessionDataEntry[](0), 0);
        }

        totalPages = (totalSessions + effectivePageSize - 1) / effectivePageSize;

        if (page == 0 || page > totalPages) {
            return (new SessionDataEntry[](0), totalPages);
        }

        uint256 startIndex = totalSessions - ((page - 1) * effectivePageSize);
        uint256 endIndexExclusive = startIndex > effectivePageSize ? startIndex - effectivePageSize : 0;
        uint256 resultLength = startIndex - endIndexExclusive;

        SessionDataEntry[] memory results = new SessionDataEntry[](resultLength);
        uint256 resultIndex = 0;

        for (uint256 i = startIndex; i > endIndexExclusive; i--) {
            string storage sessionID = sessionIDs[i - 1];
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
        return sessionIDs;
    }
}