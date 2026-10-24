#include "mpeg.h"

#include <filesystem>

#include <crow/logging.h>
#include <mpegfile.h>

#include "../tags/id3v2.h"

namespace fs = std::filesystem;

using namespace clef::music::handler;

std::expected<json, std::string> Mpeg::listMusicTags(const std::string &filePath) {
    using namespace clef::music;
    TagLib::MPEG::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected("The file is not valid");
    }

    if (!file.hasID3v2Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have ID3v2Tag";
        return std::unexpected("The file does not have ID3v2Tag");
    }

    const auto *tag = file.ID3v2Tag();
    return id3v2::listMusicTags(tag);
}

crow::response Mpeg::removeMusicTag(const TagChangeRequest &tagStruct, std::string *clefId) {
    using namespace clef::music;
    using namespace TagLib;
    const fs::path path { tagStruct.filePath };
    MPEG::File file { path.c_str() };

    if (!file.isValid()) {
        return crow::response {500, "Object is not valid"};
    }

    if (!file.hasID3v2Tag()) {
        return crow::response {500, "Object does not have an ID3v2.* Tag"};
    }

    auto *tag = file.ID3v2Tag();
    id3v2::removeMusicTag(tag, tagStruct);
    if (clefId) id3v2::ensureClefId(tag, clefId);
    file.strip(MPEG::File::ID3v1);
    file.save(MPEG::File::AllTags, File::StripNone);
    return crow::response {200, "OK" };
}

crow::response Mpeg::addMusicTag(const TagChangeRequest &tagStruct, std::string *clefId) {
    using namespace clef::music;
    using namespace TagLib;

    const fs::path path { tagStruct.filePath };
    MPEG::File file { path.c_str() };

    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << path;
        return crow::response {500, "File is not valid"};
    }
    if (!file.hasID3v2Tag()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file does not have an ID3v2Tag: " << path;
        return crow::response {500, "File does not have an ID3v2Tag"};
    }

    auto resolve = resolveTag(tagStruct.fieldType);
    if (!resolve.has_value()) {
        CROW_LOG_ERROR << resolve.error();
        return crow::response { 400, resolve.error() };
    }
    auto *tag = file.ID3v2Tag();
    id3v2::addMusicTag(tag, tagStruct, resolve.value());
    if (clefId) id3v2::ensureClefId(tag, clefId);
    file.save(MPEG::File::AllTags, File::StripNone);
    return crow::response {200, "OK" };
}

crow::response Mpeg::editMusicTags(const TagChangeRequest &tagStruct, std::string *clefId) {
    using namespace clef::music;
    using namespace TagLib;

    const fs::path path { tagStruct.filePath };
    MPEG::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << path;
        return crow::response {500, "File is not valid"};
    }
    if (!file.hasID3v2Tag()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file does not have an ID3v2Tag: " << path;
        return crow::response {500, "File does not have an ID3v2Tag"};
    }

    auto *tag = file.ID3v2Tag();
    id3v2::editMusicTags(tag, tagStruct);
    if (clefId) id3v2::ensureClefId(tag, clefId);
    file.save(MPEG::File::AllTags, File::StripNone);
    return crow::response {200, "OK" };
}

std::expected<std::string, std::string> Mpeg::resolveTag(const std::string_view tag) {
    return id3v2::resolveTag(tag);
}
