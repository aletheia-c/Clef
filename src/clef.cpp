#include "../include/clef.h"

namespace clef {
    bool Application::isExist(std::string_view path) const {
        return fs::exists(path);
    }

    bool Application::isMountPoint(std::string_view rpath) const {
        const fs::path mp{ fs::canonical(m_mountPoint) };
        const fs::path rp{ fs::weakly_canonical(rpath) }; // In case if a filepath doesn't exist

        auto mpIt = mp.begin();
        auto rpIt = rp.begin();

        while (mpIt != mp.end() && rpIt != rp.end()) {
            if (*mpIt != *rpIt)
                return false;
            ++mpIt; ++rpIt;
        }

        return mpIt == mp.end();
    }

    std::string Application::userLogin(std::string_view username, std::string_view password) {
        if (m_users.validatePassword(username, password)) {
            auto id = m_users.getUserId(username);
            //CROW_LOG_WARNING << "id: " << id;
            return m_sessionStore.createSession(id);
        }
        return "";
    }
}
