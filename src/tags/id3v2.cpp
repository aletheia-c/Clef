#include "id3v2.h"

#include <utility>

#include <crow/logging.h>
#include <textidentificationframe.h>

#include "../../include/tagConstants.h"
#include "../../include/tagMapping.h"

namespace clef::music::id3v2 {
    using namespace clef::music::tag;

    namespace {
        void removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &value) {
            using namespace TagLib;

            ID3v2::FrameList frames = tag->frameList("TXXX");
            for (auto *frame : frames) {
                auto *userFrame = dynamic_cast<ID3v2::UserTextIdentificationFrame*>(frame);
                if (!userFrame) // Continue searching for TXXX frame if it isn't
                    continue;

                const std::string frameDesc = userFrame->description().toCString(true); // Extract description
                if (frameDesc != desc) // Searching for exact frame description (name)
                    continue;

                // No specific value given - remove the whole frame.
                if (value.to8Bit().empty()) {
                    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame (" << frameDesc << ") is removed";
                    tag->removeFrame(frame);
                    return;
                }

                // Remove only the matching value, keeping the frame's other values.
                // fieldList()[0] is the description, so values start at index 1.
                StringList values{};
                bool isDeleted = false;
                bool isSkip = true;
                for (auto &f : userFrame->fieldList()) {
                    if (isSkip) {
                        isSkip = false;
                        continue;
                    }

                    if (f == value && !isDeleted) {
                        isDeleted = true;
                        continue;
                    }
                    values.append(f);
                }


                if (values.isEmpty()) {
                    // Nothing left but the description - drop the whole frame.
                    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame (" << frameDesc << ") is removed";
                    tag->removeFrame(frame);
                }
                else {
                    CROW_LOG_DEBUG << "(" << __func__ << ")" << " removing value (" << value.to8Bit(true) <<
                        ") from frame (" << frameDesc << ")";
                    userFrame->setText(values);
                }
                return;
            }
        }

        void addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &text) {
            TagLib::ID3v2::FrameList frames = tag->frameList("TXXX");

            CROW_LOG_DEBUG << "(" << __func__ << ")" << " TXXX frames size: " << frames.size();

            for (auto *frame : frames) {
                if (auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
                    const std::string frameDesc = userFrame->description().toCString(true);
                    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame description: " << frameDesc;
                    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame text: " << desc;
                    if (frameDesc == desc) {
                        // A frame already exists, so we need to append new value, keeping old ones
                        const TagLib::StringList fields = userFrame->fieldList();
                        TagLib::StringList values{};

                        // fieldList()[0] is the description, so values start at index 1.
                        // Filling values with current values of description
                        for (unsigned int i{1}; i < fields.size(); ++i)
                            values.append(fields[i]);

                        // Add our new value to list
                        // and set frame's text with our list (old values + new value)
                        values.append(text);
                        userFrame->setText(values);
                        return;
                    }
                }
            }

            // If a frame does not exist, we simply create a new one
            // Set description and text, adding this new frame to our file (tag)
            auto *newFrame = new TagLib::ID3v2::UserTextIdentificationFrame(TagLib::String::UTF8);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame desc: " << desc;
            newFrame->setDescription(desc);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame text: " << text.to8Bit(true);
            newFrame->setText(text);
            tag->addFrame(newFrame);
        }

        void editTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagChangeRequest &tagStruct) {
            using namespace clef::music;
            TagLib::ID3v2::FrameList userFrames = tag->frameList("TXXX");
            TagLib::ID3v2::UserTextIdentificationFrame *match = nullptr;

            for (auto *frame : userFrames) {
                if (auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
                    if (userFrame->description().toCString(true) == desc) {
                        match = userFrame;
                        break;
                    }
                }
            }

            if (!match) {
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " user frame not found: " << desc;
                return;
            }

            // fieldList()[0] is the description, so skip it and start from the values.
            TagLib::StringList newValues{};
            bool isSkip = true;
            for (auto &f : match->fieldList()) {
                if (isSkip) {
                    isSkip = false;
                    continue;
                }

                if (f == tagStruct.replaceWhat)
                    newValues.append(tagStruct.replaceWith);
                else
                    newValues.append(f);
            }

            match->setText(newValues);
        }
    } // namespace

    json listMusicTags(const TagLib::ID3v2::Tag *tag) {
        using namespace clef::music::tag;

        json base = json::object();
        json userdef = json::object();

        const auto map = tag->frameListMap();
        for (const auto &[frameID, frameList] : map) {
            for (auto *frame : frameList) {
                // Checking whether frame is User-defined. If not, the nullptr will result, skipping this part.
                if (const auto *user = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
                    const auto &fields = user->fieldList();
                    const auto fieldsSize = fields.size();
                    const std::string key = prefix::mp3.data() + fields[0].to8Bit(true); // Assign TXXX description

                    if (fieldsSize == 2) {
                        // If there's only description and its value
                        std::string value = fields[1].to8Bit(true); // Get single-value of TXXX description (tag field)
                        userdef[key] += value;
                    }
                    else if (fieldsSize > 2) {
                        // If there's description and multiple value
                        userdef[key] = json::array();
                        for (unsigned int i{1}; i < fieldsSize; ++i) {
                            userdef[key] += fields[i].to8Bit(true);
                        }
                    }
                    continue;
                }
                if (const auto *textFrame = dynamic_cast<TagLib::ID3v2::TextIdentificationFrame*>(frame)) {
                    const auto list = textFrame->fieldList();
                    const std::string key{frameID.data(), frameID.size()};

                    // If there's only one frame, just assign it to the id
                    // Otherwise make an array of frames of frameID name
                    if (list.size() == 1) {
                        base[key] += list.toString().to8Bit(true);
                    }
                    else if (list.size() > 1) {
                        base[key] = json::array();
                        for (const auto &values : list) {
                            base[key] += values.to8Bit(true);
                        }
                    }
                }
            }
        }
        for (const auto &a : userdef.items()) {
            base[a.key()] = a.value();
        }
        return base;
    }

    void ensureClefId(TagLib::ID3v2::Tag *tag, std::string *clefId) {
        using namespace TagLib;

        const String clefIdDescription{tag::clefId.data(), String::UTF8};
        const String rteIdDescription{tag::rteId.data(), String::UTF8};
        ID3v2::UserTextIdentificationFrame *legacyFrame{nullptr};
        for (auto *frame : tag->frameList("TXXX")) {
            auto *userFrame = dynamic_cast<ID3v2::UserTextIdentificationFrame*>(frame);
            if (!userFrame || userFrame->fieldList().size() < 2)
                continue;

            const auto description = userFrame->description().upper();
            if (description == clefIdDescription.upper()) {
                *clefId = userFrame->fieldList()[1].to8Bit(true);
                return;
            }
            if (!legacyFrame && description == rteIdDescription.upper())
                legacyFrame = userFrame;
        }

        if (legacyFrame) {
            *clefId = legacyFrame->fieldList()[1].to8Bit(true);
            legacyFrame->setDescription(clefIdDescription);
            return;
        }

        addTXXXFrame(tag, std::string(tag::clefId), *clefId);
    }

    void removeMusicTag(TagLib::ID3v2::Tag *tag, const TagChangeRequest &tagStruct) {
        using namespace clef::music;
        using namespace TagLib;
        const auto frameID = ByteVector(tagStruct.fieldType.c_str());
        const std::string frameIDstr{frameID.data(), frameID.size()};
        auto frames = tag->frameList(frameID);

        if (frameIDstr.starts_with(prefix::mp3)) {
            const std::string desc = tagStruct.fieldType.substr(prefix::mp3.size());
            removeTXXXFrame(tag, desc, tagStruct.value);
        }

        if (!frames.isEmpty()) {
            StringList values{};
            bool isDeleted = false;
            for (auto &a : frames) {
                if (const auto *b = dynamic_cast<ID3v2::TextIdentificationFrame*>(a)) {
                    for (const auto &v : b->fieldList()) {
                        if (v == tagStruct.value && !isDeleted) {
                            isDeleted = true;
                            continue;
                        }
                        values.append(v);
                    }
                }
            }
            tag->removeFrames(frameID);
            auto *f = new ID3v2::TextIdentificationFrame(frameID);
            f->setText(values);
            tag->addFrame(f);
        }
    }

    void addMusicTag(TagLib::ID3v2::Tag *tag, const TagChangeRequest &tagStruct, const std::string &resolvedField) {
        using namespace clef::music;
        using namespace TagLib;

        auto frameID = ByteVector(resolvedField.c_str());
        auto frames = tag->frameList(frameID);
        const std::string frameIDstr{frameID.data(), frameID.size()};

        if (frameIDstr.starts_with(prefix::mp3)) {
            const std::string desc = resolvedField.substr(prefix::mp3.size());
            addTXXXFrame(tag, desc, tagStruct.value);
            return;
        }

        if (frames.isEmpty()) {
            auto *newFrame = new ID3v2::TextIdentificationFrame(frameID);
            newFrame->setText(tagStruct.value);
            tag->addFrame(newFrame);
        }
        else if (auto *f = dynamic_cast<ID3v2::TextIdentificationFrame*>(frames.front())) {
            StringList values{f->fieldList()};
            values.append(tagStruct.value);
            f->setText(values);
        }
    }

    void editMusicTags(TagLib::ID3v2::Tag *tag, const TagChangeRequest &tagStruct) {
        using namespace clef::music;
        using namespace TagLib;

        auto frameID = ByteVector(tagStruct.fieldType.c_str());
        auto frames = tag->frameList(frameID);
        const std::string frameIDstr{frameID.data(), frameID.size()};

        // Edit user-defined (TXXX) tags
        if (frameIDstr.starts_with(prefix::mp3)) {
            const std::string desc = tagStruct.fieldType.substr(5); // TXXX:
            editTXXXFrame(tag, desc, tagStruct);
            return;
        }

        CROW_LOG_WARNING << "frames.size(): " << frames.size();
        StringList values{};
        for (const auto a : frames) {
            if (const auto *b = dynamic_cast<ID3v2::TextIdentificationFrame*>(a)) {
                for (const auto &v : b->fieldList()) {
                    if (v == tagStruct.replaceWhat)
                        values.append(tagStruct.replaceWith);
                    else
                        values.append(v);
                }
            }
        }

        tag->removeFrames(frameID);
        auto *newFrame = new ID3v2::TextIdentificationFrame(frameID);
        newFrame->setText(values);
        tag->addFrame(newFrame);
    }

    std::expected<std::string, std::string> resolveTag(const std::string_view tag) {
        auto resolve = getTagMap()->resolve(tag.data(), "id3v2");
        if (resolve.has_value())
            return resolve.value();
        return std::unexpected(std::move(resolve).error());
    }
} // namespace clef::music::id3v2
