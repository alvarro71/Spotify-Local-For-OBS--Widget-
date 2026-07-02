cmake_minimum_required(VERSION 3.16)
project(obs-spotify-overlay VERSION 1.0.0 LANGUAGES C)

set(CMAKE_C_STANDARD 11)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

find_package(LibObs REQUIRED)

set(PLUGIN_NAME "obs-spotify-overlay")

set(SOURCES
	src/plugin-main.c
)

if(WIN32)
set(SOURCES ${SOURCES})
else()
message(FATAL_ERROR "Only Windows is supported")
endif()

add_library(${PLUGIN_NAME} MODULE ${SOURCES})

target_include_directories(${PLUGIN_NAME} PRIVATE
	${LIBOBS_INCLUDE_DIR}
)

target_compile_definitions(${PLUGIN_NAME} PRIVATE
	_CRT_SECURE_NO_WARNINGS
)

target_link_libraries(${PLUGIN_NAME} PRIVATE
	${LIBOBS_LIB}
	kernel32
)

set_target_properties(${PLUGIN_NAME} PROPERTIES PREFIX "")

install(TARGETS ${PLUGIN_NAME}
	LIBRARY DESTINATION "obs-plugins/64bit"
	RUNTIME DESTINATION "obs-plugins/64bit"
)
