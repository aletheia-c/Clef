#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H

#include <memory>

#include "../../include/interface.h"

namespace clef::music::handler {
    class Factory {
        public:
        static std::unique_ptr<Interface> create(std::string_view extension);
    };
}

#endif //WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H