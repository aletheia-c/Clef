#ifndef CLEF_ID3V2_H
#define CLEF_ID3V2_H

#include <expected>
#include <string>
#include <string_view>

#include <id3v2tag.h>
#include <nlohmann/json.hpp>

#include "../../include/tagChangeRequest.h"

namespace clef::music::id3v2 {
    using json = nlohmann::json;

    // The caller owns the tag and handles file validation and saving.
    json listMusicTags(const TagLib::ID3v2::Tag *tag);
    void ensureClefId(TagLib::ID3v2::Tag *tag, std::string *clefId);
    void removeMusicTag(TagLib::ID3v2::Tag *tag, const TagChangeRequest &tagStruct);
    // resolvedField is the mapped field name; tagStruct remains unchanged.
    void addMusicTag(TagLib::ID3v2::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
    void editMusicTags(TagLib::ID3v2::Tag *tag, const TagChangeRequest &tagStruct);
    std::expected<std::string, std::string> resolveTag(std::string_view tag);
}

#endif //CLEF_ID3V2_H
