#ifndef CLEF_RIFF_H
#define CLEF_RIFF_H

#include <string>

#include <infotag.h>
#include <nlohmann/json.hpp>
#include "../../include/tagChangeRequest.h"

namespace clef::music::riff {
    using namespace TagLib::RIFF;
    using json = nlohmann::json;

    json listMusicTags(const Info::Tag *tag);
    void removeMusicTag(Info::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
    void addMusicTag(Info::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
    void editMusicTag(Info::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField);
}

#endif //CLEF_RIFF_H
