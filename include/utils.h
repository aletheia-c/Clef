#ifndef WEB_TAG_EDITOR_UTILS_H
#define WEB_TAG_EDITOR_UTILS_H

#include <algorithm>
#include <string>
#include <optional>
#include "clef.h"

namespace clef::utils {
    bool naturalLess(std::string_view l, std::string_view r);
    bool nameLess(const FileEntity &a, const FileEntity &b);
    bool entityLess(const FileEntity &a, const FileEntity &b, const QueryList &q);
    std::optional<bool> parseBool(std::string_view a);
    std::optional<QueryList::SortType> parseSortType(std::string_view a);
    std::string generateId(std::size_t t=16);
    std::string getExtension(const std::string &path);

}

#endif //WEB_TAG_EDITOR_UTILS_H
