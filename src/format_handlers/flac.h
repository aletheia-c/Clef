#ifndef WEB_TAG_EDITOR_FLACTAGHANDLER_H
#define WEB_TAG_EDITOR_FLACTAGHANDLER_H

#include <xiphcomment.h>
#include "../../include/music.h"
#include "../../include/interface.h"
#include "../../include/clef.h"

namespace clef::music::handler {
    class Flac : public Interface {
    private:
        constexpr static std::string_view m_type { "vorbis" };
        static void ensureClefId(std::string *clefId, TagLib::Ogg::XiphComment *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const TagModification &tagStruct, std::string *clefId = nullptr) override;
        crow::response addMusicTag(const TagModification &tagStruct, std::string *clefId = nullptr) override;
        crow::response editMusicTags(const TagModification &tagStruct, std::string *clefId = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override;
        void removeAlbumCover(const std::string& filePath) override {}
        void addAlbumCover(const std::string& filePath) override {}
        std::expected<std::string, std::string> resolveTag(std::string_view tag) override;
    };
}

#endif //WEB_TAG_EDITOR_FLACTAGHANDLER_H