cmake_minimum_required(VERSION 3.25)
project(Clef)

set(CMAKE_CXX_STANDARD 23)

# Find TagLib using pkg-config
find_package(PkgConfig REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(ZLIB REQUIRED)
pkg_check_modules(TAGLIB REQUIRED taglib>=2.0)

include(FetchContent)
FetchContent_Declare(
        SQLiteCpp
        GIT_REPOSITORY https://github.com/SRombauts/SQLiteCpp.git
        GIT_TAG 3.3.3
)
FetchContent_MakeAvailable(SQLiteCpp)

# Your executable
add_executable(Clef src/main.cpp
        include/clef.h
        include/interface.h
        src/format_handlers/flac.h
        src/format_handlers/flac.cpp
        src/format_handlers/factory.h
        src/format_handlers/factory.cpp
        src/format_handlers/mpeg.cpp
        src/format_handlers/mpeg.h
        src/format_handlers/mpeg4.cpp
        src/format_handlers/mpeg4.h
        src/format_handlers/oggTag.cpp
        src/format_handlers/oggTag.h
        src/format_handlers/oggVorbis.cpp
        src/format_handlers/oggVorbis.h
        src/format_handlers/oggFlac.cpp
        src/format_handlers/oggFlac.h
        src/format_handlers/oggOpus.cpp
        src/format_handlers/oggOpus.h
        src/format_handlers/oggSpeex.cpp
        src/format_handlers/oggSpeex.h
        src/tagMapping.cpp
        include/music.h
        include/storage.h
        src/storage.cpp
        include/utils.h
        src/utils.cpp
)

# Include headers
target_include_directories(Clef PRIVATE ${TAGLIB_INCLUDE_DIRS})
target_link_libraries(Clef PRIVATE ${TAGLIB_LIBRARIES})
target_link_libraries(Clef PRIVATE nlohmann_json::nlohmann_json)
target_link_libraries(Clef PRIVATE SQLiteCpp sqlite3 pthread dl)
target_link_libraries(Clef PRIVATE ZLIB::ZLIB)

# Compiler flags (if needed)
target_compile_options(Clef PRIVATE ${TAGLIB_CFLAGS_OTHER})
target_compile_definitions(Clef
        PRIVATE $<$<CONFIG:Debug>:APP_DEBUG>
)
target_compile_definitions(Clef PRIVATE CROW_ENABLE_COMPRESSION)