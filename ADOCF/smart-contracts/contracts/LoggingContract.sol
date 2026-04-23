// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LoggingContract is Ownable {
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
    ) external onlyOwner {
        SessionDataEntry storage session = sessionData[sessionID];
        bool isNewSession = bytes(session.txHash).length == 0 && session.logs.length == 0;

        delete session.logs;
        session.txHash = txHash;

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry memory logEntry = logEntries[i];
            session.logs.push();

            LogEntry storage storedLog = session.logs[session.logs.length - 1];
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

        if (isNewSession) {
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
            string memory sessionID = sessionIDs[i - 1];
            SessionDataEntry storage stored = sessionData[sessionID];
            results[resultIndex] = stored;
            resultIndex++;
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view returns (string[] memory) {
        return sessionIDs;
    }
}