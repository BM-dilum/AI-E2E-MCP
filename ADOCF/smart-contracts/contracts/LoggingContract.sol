pragma solidity 0.8.0;

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
        bool isNewSession = bytes(sessionData[sessionID].txHash).length == 0 && sessionData[sessionID].logs.length == 0;

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
                storedLog.toolCalls.push(ToolCall({
                    name: sourceToolCall.name,
                    args: sourceToolCall.args,
                    result: sourceToolCall.result
                }));
            }
        }

        entry.txHash = txHash;

        if (isNewSession) {
            sessionIDs.push(sessionID);
        }

        emit LogsUploaded(sessionID, logEntries, txHash);
    }

    function getLogs(uint256 page, uint256 pageSize)
        external
        view
        returns (SessionDataEntry[] memory, uint256 totalPages)
    {
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
            SessionDataEntry storage storedEntry = sessionData[sessionID];

            SessionDataEntry memory copiedEntry;
            copiedEntry.txHash = storedEntry.txHash;
            copiedEntry.logs = new LogEntry[](storedEntry.logs.length);

            for (uint256 j = 0; j < storedEntry.logs.length; j++) {
                LogEntry storage storedLog = storedEntry.logs[j];
                LogEntry memory copiedLog;
                copiedLog.userRequest = storedLog.userRequest;
                copiedLog.response = storedLog.response;
                copiedLog.toolCalls = new ToolCall[](storedLog.toolCalls.length);

                for (uint256 k = 0; k < storedLog.toolCalls.length; k++) {
                    ToolCall storage storedToolCall = storedLog.toolCalls[k];
                    copiedLog.toolCalls[k] = ToolCall({
                        name: storedToolCall.name,
                        args: storedToolCall.args,
                        result: storedToolCall.result
                    });
                }

                copiedEntry.logs[j] = copiedLog;
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