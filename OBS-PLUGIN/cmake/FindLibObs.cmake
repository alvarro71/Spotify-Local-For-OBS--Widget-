find_path(LIBOBS_INCLUDE_DIR
NAMES obs.h
PATHS
"${CMAKE_SOURCE_DIR}/obs-sdk/obs-source/obs-studio-32.1.2/libobs"
"${CMAKE_SOURCE_DIR}/../obs-sdk/obs-source/obs-studio-32.1.2/libobs"
"$ENV{OBS_PATH}/libobs"
"$ENV{LIBOBS_INCLUDE_DIR}"
/usr/include/obs
/usr/local/include/obs
"C:/Program Files/obs-studio/libobs"
PATH_SUFFIXES include
)

find_library(LIBOBS_LIB
NAMES obs obs64
PATHS
"${CMAKE_SOURCE_DIR}/obs-sdk/obs-studio/bin/64bit"
"${CMAKE_SOURCE_DIR}/../obs-sdk/obs-studio/bin/64bit"
"$ENV{OBS_PATH}/libobs"
"$ENV{LIBOBS_LIB}"
/usr/lib
/usr/local/lib
"C:/Program Files/obs-studio/libobs"
"C:/Program Files/obs-studio/bin/64bit"
PATH_SUFFIXES lib bin
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(LibObs DEFAULT_MSG LIBOBS_LIB LIBOBS_INCLUDE_DIR)

if(LIBOBS_FOUND AND NOT TARGET LibObs::LibObs)
    add_library(LibObs::LibObs UNKNOWN IMPORTED)
    set_target_properties(LibObs::LibObs PROPERTIES
        IMPORTED_LOCATION "${LIBOBS_LIB}"
        INTERFACE_INCLUDE_DIRECTORIES "${LIBOBS_INCLUDE_DIR}"
    )
endif()

mark_as_advanced(LIBOBS_INCLUDE_DIR LIBOBS_LIB)
