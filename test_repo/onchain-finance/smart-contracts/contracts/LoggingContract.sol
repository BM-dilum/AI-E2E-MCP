// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract LoggingContract {
    struct ToolCall {
        string name;
        string argsHash;
        string resultHash;
    }

    struct LogEntry {
        string userRequestHash;
        string responseHash;
        ToolCall[] toolCalls;
    }

    struct SessionDataEntry {
        LogEntry[] logs;
        string cid;
        address uploader;
        bool exists;
    }

    mapping(string => SessionDataEntry) private sessionData;
    string[] private sessionIDs;

    uint256 public constant DEFAULT_PAGE_SIZE = 10;
    address public immutable admin;

    event LogsUploaded(string indexed sessionID, string cid);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function uploadLogs(
        string memory sessionID,
        LogEntry[] memory logEntries,
        string memory cid
    ) external {
        SessionDataEntry storage entry = sessionData[sessionID];

        if (!entry.exists) {
            entry.exists = true;
            entry.uploader = msg.sender;
            sessionIDs.push(sessionID);
        } else {
            require(msg.sender == entry.uploader || msg.sender == admin, "Not authorized");
        }

        delete entry.logs;

        for (uint256 i = 0; i < logEntries.length; i++) {
            LogEntry memory logEntry = logEntries[i];
            entry.logs.push();

            LogEntry storage storedLog = entry.logs[entry.logs.length - 1];
            storedLog.userRequestHash = logEntry.userRequestHash;
            storedLog.responseHash = logEntry.responseHash;

            for (uint256 j = 0; j < logEntry.toolCalls.length; j++) {
                ToolCall memory toolCall = logEntry.toolCalls[j];
                storedLog.toolCalls.push(ToolCall({
                    name: toolCall.name,
                    argsHash: toolCall.argsHash,
                    resultHash: toolCall.resultHash
                }));
            }
        }

        entry.cid = cid;

        emit LogsUploaded(sessionID, cid);
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

            results[resultIndex].cid = storedEntry.cid;
            results[resultIndex].uploader = storedEntry.uploader;
            results[resultIndex].exists = storedEntry.exists;

            LogEntry[] memory logCopies = new LogEntry[](storedEntry.logs.length);
            for (uint256 j = 0; j < storedEntry.logs.length; j++) {
                LogEntry storage storedLog = storedEntry.logs[j];
                logCopies[j].userRequestHash = storedLog.userRequestHash;
                logCopies[j].responseHash = storedLog.responseHash;

                ToolCall[] memory toolCallCopies = new ToolCall[](storedLog.toolCalls.length);
                for (uint256 k = 0; k < storedLog.toolCalls.length; k++) {
                    ToolCall storage storedToolCall = storedLog.toolCalls[k];
                    toolCallCopies[k] = ToolCall({
                        name: storedToolCall.name,
                        argsHash: storedToolCall.argsHash,
                        resultHash: storedToolCall.resultHash
                    });
                }
                logCopies[j].toolCalls = toolCallCopies;
            }
            results[resultIndex].logs = logCopies;
        }

        return (results, totalPages);
    }

    function getSessionIDs() external view returns (string[] memory) {
        return sessionIDs;
    }
}