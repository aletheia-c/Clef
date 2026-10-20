#include "xiph.h"

#include <cstddef>

#include <crow/logging.h>
#include "../../include/tagConstants.h"
#include "../../include/tagMapping.h"
#include "../../include/utils.h"

namespace clef::music::xiph {

    json listMusicTags(const TagLib::Ogg::XiphComment *tag) {
        json j;
        for (const auto &[key, values] : tag->fieldListMap()) {
            if (values.size() > 1) {
                const std::size_t temp { values.size() };
                for (std::size_t i { 0 }; i < temp; ++i) {
                    const std::string value { values[i].to8Bit(true) };
                    j[key.to8Bit(true)] += value;
                }
                continue;
            }
            std::string value { values[0].to8Bit(true) };
            j[key.to8Bit(true)] += value;
        }
        return j;
    }

    std::expected<void, std::string> removeMusicTag(TagLib::Ogg::XiphComment *tag, const TagChangeRequest &tagStruct) {
        auto f_it = tag->fieldListMap().find(tagStruct.fieldType);
        const auto f_itEnd = tag->fieldListMap().end();

        // Save values of key (denormFieldType) to values
        TagLib::StringList values {};
        if (f_it != f_itEnd) {
            values = f_it->second;
        } else {
            // Try to find upper case tag in case if a client sends lower case tag
            f_it = tag->fieldListMap().find(utils::toUpperCase(tagStruct.fieldType));
            if (f_it != f_itEnd) {
                values = f_it->second;
            } else {
                CROW_LOG_ERROR << __PRETTY_FUNCTION__ << ": " << tagStruct.fieldType
                << " was not found in " << tagStruct.filePath;
                return std::unexpected("Error");
            }
        }

        // Find occurrence of tagStruct.value. If so, delete it.
        if (const auto values_it = values.find(tagStruct.value); values_it != values.end()) {
            values.erase(values_it);
        } else {
            CROW_LOG_ERROR << __PRETTY_FUNCTION__ << ": " << tagStruct.value.toCString(true) << " was not found in file "
                << tagStruct.filePath;
            return std::unexpected("Specified value was not found!");
        }

        // Remove all values (fields) of a specified key (denormFieldType)
        // And fill the key with values
        tag->removeFields(tagStruct.fieldType);
        for (const auto &s : values) {
            tag->addField(tagStruct.fieldType, s, false);
        }
        CROW_LOG_INFO << __PRETTY_FUNCTION__ << ": " << tagStruct.fieldType << " field was removed!";
        return {};
    }

    void ensureClefId(TagLib::Ogg::XiphComment *tag, std::string *clefId) {
        using namespace clef::music::tag;
        using namespace TagLib;

        const auto flMap = tag->fieldListMap();
        if (const auto clefIdIt = flMap.find(String(tag::clefId.data()).upper()); clefIdIt != flMap.end()) {
            *clefId = clefIdIt->second[0].toCString(false);
        } else {
            if (const auto rteIdIt = flMap.find(tag::rteId.data()); rteIdIt != flMap.end()) {
                *clefId = rteIdIt->second[0].toCString(false);
                tag->removeFields(tag::rteId.data());
            }
            tag->addField(tag::clefId.data(), *clefId, true);
        }
    }


    void addMusicTag(TagLib::Ogg::XiphComment *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        tag->addField(resolvedField, tagStruct.value, false);
    }

    std::expected<void, std::string> editMusicTags(TagLib::Ogg::XiphComment *tag, const TagChangeRequest &tagStruct) {
        const auto filedType_it = tag->fieldListMap().find(tagStruct.fieldType);
        TagLib::StringList values {}; // Here we store old values of a music file

        // Check whether tagStruct.tagType was found
        // If yes, fill StringList oldValues with tagStruct.values
        if (filedType_it != tag->fieldListMap().end()) {
            values = filedType_it->second; // Get an array of old values inside music file
        } else {
            CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.fieldType << " was not found in " << tagStruct.filePath;
            return std::unexpected("Field type does not exist");
        }

        if (const auto v_it = values.find(tagStruct.replaceWhat); v_it != values.end()) {
            *v_it = tagStruct.replaceWith;
        } else {
            CROW_LOG_ERROR << __PRETTY_FUNCTION__ << ": " << tagStruct.replaceWhat.toCString(true) << " was not found in file "
                << tagStruct.filePath;
            return std::unexpected("Specified value was not found in a file. Check logs");
        }

        // After filling up StringList newValues, we need to clear current tags inside a file
        // Then we write newValues to requested tag field (tagStruct.tagType) without replacing.
        tag->removeFields(tagStruct.fieldType);
        for (const auto &a : values) {
            tag->addField(tagStruct.fieldType, a, false);
            CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.fieldType << " of " << tagStruct.filePath << " has changed to " << a.toCString();
        }

        return {};
    }

    std::expected<std::string, std::string> resolveTag(std::string_view tag) {
        return tag::getTagMap()->resolve(std::string(tag), "vorbis");
    }
}
