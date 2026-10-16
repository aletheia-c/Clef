#ifndef CLEF_CLEFCONSTANTS_H
#define CLEF_CLEFCONSTANTS_H

#include <string_view>

namespace clef {
    constexpr std::string_view version { "0.0.1" };
    constexpr std::string_view name { "Clef" };
    constexpr std::string_view jsonMissingValue { "__json_missing_value" };
    constexpr std::string_view defaultDatabasePath { "data/database.db" };
    constexpr std::string_view defaultMappingPath { "data/mapping.json" };
    constexpr std::string_view defaultMountPoint { "/music" };
    constexpr bool defaultClefIdStatus { false };
    constexpr int defaultPort { 18080 };

    namespace http::messages {
        inline constexpr std::string_view bodyRequired              { "Request body is required." };
        inline constexpr std::string_view invalidJson               { "Request body must contain valid JSON." };
        inline constexpr std::string_view invalidRequestFields      { "Required fields are missing or invalid." };
        inline constexpr std::string_view pathRequired              { "Query parameter 'path' is required." };
        inline constexpr std::string_view pathForbidden             { "The requested path is outside the allowed directory." };
        inline constexpr std::string_view unsupportedFileFormat     { "The requested file format is not supported." };
        inline constexpr std::string_view unsupportedTag            { "The requested tag is not supported for this file format." };
        inline constexpr std::string_view fileNotFound              { "The requested file was not found." };
        inline constexpr std::string_view directoryNotFound         { "The requested directory was not found." };
        inline constexpr std::string_view invalidAudioFile          { "The file could not be opened as a supported audio file." };
        inline constexpr std::string_view tagNotFound               { "The requested tag was not found in the file." };
        inline constexpr std::string_view tagValueNotFound          { "The requested tag value was not found in the file." };
        inline constexpr std::string_view replacementValueNotFound  { "The value to replace was not found. Refresh the tags and try again." };
        inline constexpr std::string_view destinationExists         { "A file or directory with the destination name already exists." };
        inline constexpr std::string_view saveFailed                { "Changes could not be saved to the file." };
        inline constexpr std::string_view internalError             { "An unexpected server error occurred." };
    }
}

#endif // CLEF_CLEFCONSTANTS_H
