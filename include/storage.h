#ifndef WEB_TAG_EDITOR_SQLITE_H
#define WEB_TAG_EDITOR_SQLITE_H

#include <crow/logging.h>

#include "clef.h"
#include "SQLiteCpp/SQLiteCpp.h"
#include "crow/http_response.h"

namespace clef::storage {
    constexpr std::string_view add { "add" };
    constexpr std::string_view change { "change" };
    constexpr std::string_view remove { "remove" };
    constexpr std::string_view rollback { "rollback" };

    struct id {
        std::string clefId { "NULL" };
        std::string action { "NULL" };
    };

    class Database {
    private:
        SQLite::Database m_database;
    public:
        Database(const std::string &path)
            : m_database(path, SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE)
        {
            CROW_LOG_WARNING << "Opening database: " << path;
            m_database.exec(R"(
                CREATE TABLE IF NOT EXISTS tag_history (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    path         TEXT    NOT NULL,
                    clefId       TEXT,
                    action       TEXT    NOT NULL,
                    tag          TEXT    NOT NULL,
                    old_value    TEXT,
                    new_value    TEXT,
                    changed_at   TEXT NOT NULL DEFAULT (datetime('now'))
                )
            )");
            SQLite::Statement tableInfo { m_database, "PRAGMA table_info(tag_history)" };
            while (tableInfo.executeStep()) {
                if (tableInfo.getColumn("name").getString() == "rteid") {
                    CROW_LOG_WARNING << "Migrating database: renaming column 'rteid' to 'clefId'";
                    m_database.exec("ALTER TABLE tag_history RENAME COLUMN rteid TO clefId");
                    CROW_LOG_WARNING << "Database migration completed";
                }
            }
        }

        SQLite::Database &getDatabase() { return m_database; };
        crow::response insertAdd(const TagModification &tagStruct, const id &idStruct) const;
        crow::response insertRemove(const TagModification &tagStruct, const id &idStruct) const;
        crow::response insertEdit(const TagModification &tagStruct, const id &idStruct) const;
        crow::response deleteFile(const std::string &path) const;
    };
}

#endif //WEB_TAG_EDITOR_SQLITE_H
