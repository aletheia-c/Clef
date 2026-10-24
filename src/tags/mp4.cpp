#include "mp4.h"

#include <algorithm>

#include <crow/logging.h>

#include "../../include/tagConstants.h"
#include "../../include/tagMapping.h"

namespace clef::music::mp4 {
    using namespace clef::music::tag;

    namespace {
        std::expected<void, std::string> setMusicTag(TagLib::MP4::Tag *tag, const TagLib::String &value, const std::string &resolvedField) {
            const TagLib::String atomKey { resolvedField, TagLib::String::UTF8 };

            const auto &itemMap = tag->itemMap();
            const auto existingIt = itemMap.find(atomKey);
            const auto targetType = existingIt != itemMap.end()
                ? existingIt->second.type()
                : TagLib::MP4::Item::Type::StringList;

            switch (targetType) {
                using namespace TagLib::MP4;
                case Item::Type::StringList: {
                    const Item item { TagLib::StringList{ value } };
                    tag->setItem(atomKey, item);
                    break;
                }
                case Item::Type::Int: {
                    const Item item { std::stoi(value.toCString())};
                    tag->setItem(atomKey, item);
                    break;
                }
                case Item::Type::IntPair: {
                    const auto sep = value.find('/');
                    if (sep != std::string::npos) {
                        const int first = std::stoi(value.to8Bit().substr(0, sep));
                        const int second = std::stoi(value.to8Bit().substr(sep + 1));
                        tag->setItem(atomKey, Item(first, second));
                    } else {
                        tag->setItem(atomKey, Item(std::stoi(value.toCString())));
                    }
                    break;
                }
                case Item::Type::Bool: {
                    tag->setItem(atomKey, Item(value == "1" || value == "true"));
                    break;
                }
                case Item::Type::UInt: {
                    tag->setItem(atomKey, Item(static_cast<unsigned int>(std::stoul(value.toCString()))));
                    break;
                }
                case Item::Type::LongLong: {
                    tag->setItem(atomKey, Item(std::stoll(value.toCString())));
                    break;
                }
                case Item::Type::Byte: {
                    tag->setItem(atomKey, Item(static_cast<unsigned char>(std::stoi(value.toCString()))));
                    break;
                }
                default:
                    return std::unexpected("Not implemented method");
            }

            return {};
        }
    }

    void ensureClefId(TagLib::MP4::Tag *tag, std::string *clefId) {
        using namespace clef::music;
        using namespace TagLib;

        const String clefIdAtom { std::string(prefix::m4a) + tag::clefId.data() };
        const auto iMap = tag->itemMap();
        const auto findAtom = [&] (const String &name) {
            const auto normalized = name.upper();
            return std::ranges::find_if(iMap, [&](const auto &entry) {
                return entry.first.upper() == normalized;
            });
        };
        if (const auto clefIdIt = findAtom(clefIdAtom); clefIdIt != iMap.end()) {
            *clefId = clefIdIt->second.toStringList()[0].toCString(false);
        } else {
            const String rteIdAtom { std::string(prefix::m4a) + rteId.data() };
            if (const auto rteIdIt = findAtom(rteIdAtom); rteIdIt != iMap.end()) {
                *clefId = rteIdIt->second.toStringList()[0].toCString(false);
                tag->removeItem(rteIdIt->first);
            }
            tag->setItem(clefIdAtom, MP4::Item{StringList{String{*clefId, String::UTF8}}});
        }
    }

    json listMusicTags(const TagLib::MP4::Tag *tag) {
        using Type = TagLib::MP4::Item::Type;
        json base = json::object();

        const auto &map = tag->itemMap();

        for (const auto &[key, value] : map) {
            switch (value.type()) {
                case Type::StringList: {
                        for (const auto &x : value.toStringList()) {
                            base[key.to8Bit(true)] += x.toCString(true);
                        }
                        break;
                    }
                case Type::Int:
                    base[key.to8Bit(true)] = value.toInt();
                    break;
                case Type::IntPair: {
                    const auto [first, second] = value.toIntPair();
                    base[key.to8Bit(true)] = std::to_string(first) + "/" + std::to_string(second);
                    break;
                }
                case Type::Bool:
                    base[key.to8Bit(true)] = value.toBool();
                    break;
                case Type::UInt:
                    base[key.to8Bit(true)] = value.toUInt();
                    break;
                case Type::LongLong:
                    base[key.to8Bit(true)] = value.toLongLong();
                    break;
                case Type::Byte:
                    base[key.to8Bit(true)] = value.toByte();
                    break;
                case Type::ByteVectorList:
                case Type::CoverArtList:
                case Type::Stem:
                case Type::Void:
                    CROW_LOG_WARNING << __PRETTY_FUNCTION__ << " atom type is not implemented";
                    break;
            }
        }

        return base;
    }

    void removeMusicTag(TagLib::MP4::Tag *tag, const TagChangeRequest &tagStruct) {
        tag->removeItem(TagLib::String { tagStruct.fieldType, TagLib::String::UTF8 });
    }

    std::expected<void, std::string> addMusicTag(TagLib::MP4::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        return setMusicTag(tag, tagStruct.value, resolvedField);
    }

    std::expected<void, std::string> editMusicTags(TagLib::MP4::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        return setMusicTag(tag, tagStruct.replaceWith, resolvedField);
    }

    std::expected<std::string, std::string> resolveTag(std::string_view tag) {
        return getTagMap()->resolve(std::string(tag), "mp4");
    }
} // namespace clef::music::mp4
