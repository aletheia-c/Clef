#ifndef CLEF_MP4_H
#define CLEF_MP4_H

#include <expected>
#include <string>
#include <string_view>

#include <mp4tag.h>
#include <nlohmann/json.hpp>

#include "../../include/tagChangeRequest.h"

namespace clef::music::mp4 {
    using json = nlohmann::json;

    // The caller owns the tag and handles file validation and saving.
    json listMusicTags(const TagLib::MP4::Tag *tag);
    void ensureClefId(TagLib::MP4::Tag *tag, std::string *clefId);
    void removeMusicTag(TagLib::MP4::Tag *tag, const TagChangeRequest &tagStruct);
    std::expected<void, std::string> addMusicTag(TagLib::MP4::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
    std::expected<void, std::string> editMusicTags(TagLib::MP4::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
    std::expected<std::string, std::string> resolveTag(std::string_view tag);
}

#endif // CLEF_MP4_H
