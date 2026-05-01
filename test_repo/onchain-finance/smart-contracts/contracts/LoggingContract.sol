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

    mapping(string => SessionDataEntry) private sessionData;
    string[] private sessionIDs;

    uint256 public constant DEFAULT_PAGE_SIZE = 10;

    event LogsUploaded(string indexed sessionID, LogEntry[] logEntries, string txHash);

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory txHash
    ) external {
        SessionDataEntry storage entry = sessionData[sessionID];

        if (bytes(entry.txHash).length == 0) {
            sessionIDs.push(sessionID);
        }

        delete entry.logs;

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry memory logEntry = logEntries[i];
            entry.logs.push();

            LogEntry storage storedLog = entry.logs[entry.logs.length - 1];
            storedLog.userRequest = logEntry.userRequest;
            storedLog.response = logEntry.response;

            for (uint256 j = 0; j < logEntry.toolCalls.length; j++) {
                ToolCall memory toolCall = logEntry.toolCalls[j];
                storedLog.toolCalls.push(ToolCall({
                    name: toolCall.name,
                    args: toolCall.args,
                    result: toolCall.result
                }));
            }
        }

        entry.txHash = txHash;

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

        uint256 start = (page - 1) * effectivePageSize;
        uint256 end = start + effectivePageSize;
        if (end > totalSessions) {
            end = totalSessions;
        }

        SessionDataEntry[] memory results = new SessionDataEntry[](end - start);

        for (uint256 i = start; i < end; i++) {
            SessionDataEntry storage storedEntry = sessionData[sessionIDs[i]];
            uint256 resultIndex = i - start;

            results[resultIndex].txHash = storedEntry.txHash;

            for (uint256 j = 0; j < storedEntry.logs.length; j++) {
                LogEntry storage storedLog = storedEntry.logs[j];
                results[resultIndex].logs.push();

                LogEntry storage resultLog = results[resultIndex].logs[results[resultIndex].logs.length - 1];
                resultLog.userRequest = storedLog.userRequest;
                resultLog.response = storedLog.response;

                for (uint256 k = 0; k < storedLog.toolCalls.length; k++) {
                    ToolCall storage storedToolCall = storedLog.toolCalls[k];
                    resultLog.toolCalls.push(ToolCall({
                        name: storedToolCall.name,
                        args: storedToolCall.args,
                        result: storedToolCall.result
                    }));
                }
            }
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view returns (string[] memory) {
        return sessionIDs;
    }
}