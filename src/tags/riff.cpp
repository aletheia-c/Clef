#include "riff.h"

namespace clef::music::riff {
    json listMusicTags(const Info::Tag *tag) {
        json j = json::object();
        auto list = tag->fieldListMap();
        for (const auto &[key, value] : list) {
            j[TagLib::String(key).toCString()] += value.to8Bit(true);
        }

        return j;
    }

    void removeMusicTag(Info::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        using namespace TagLib;
        const auto fieldId = ByteVector(resolvedField.c_str());
        tag->removeField(fieldId);
    }

    void addMusicTag(Info::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        using namespace TagLib;
        const auto fieldId = ByteVector(resolvedField.c_str());
        tag->setFieldText(fieldId, tagStruct.value);
    }

    void editMusicTag(Info::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        using namespace TagLib;
        const auto fieldId = ByteVector(resolvedField.c_str());
        tag->setFieldText(fieldId, tagStruct.replaceWith);
    }
}
