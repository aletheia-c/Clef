#ifndef CLEF_XIPH_H
#define CLEF_XIPH_H

#include <expected>
#include <string>
#include <string_view>

#include <nlohmann/json.hpp>
#include <xiphcomment.h>

#include "../../include/tagChangeRequest.h"

namespace clef::music::xiph {
    using json = nlohmann::json;

    json listMusicTags(const TagLib::Ogg::XiphComment *tag);
    void ensureClefId(TagLib::Ogg::XiphComment *tag, std::string *clefId);
    std::expected<void, std::string> removeMusicTag(TagLib::Ogg::XiphComment *tag, const TagChangeRequest &tagStruct);
    void addMusicTag(TagLib::Ogg::XiphComment *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
    std::expected<void, std::string> editMusicTags(TagLib::Ogg::XiphComment *tag, const TagChangeRequest &tagStruct);
    std::expected<std::string, std::string> resolveTag(std::string_view tag);
}

#endif //CLEF_XIPH_H
