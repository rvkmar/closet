from string import Template
from typing import Tuple
from pathlib import Path
from os.path import dirname, realpath

from aqt import mw

from .utils import (
    closet_enabled,
    closet_version_per_model,
    find_addon_by_name,
)

from .version import version


default_version = 'v0.1'
default_description = '''This is the configuration of how Closet will behave.
To get inspiration you can visit the homepage: closetengine.com.'''
default_name = 'Closet Setup'

script_name = 'ClosetUser'
user_tag = f'{script_name}Tag'
user_id = f'{script_name}Id'

if am := find_addon_by_name('Asset Manager'):
    lib = __import__(am).src.lib

class DoubleTemplate(Template):
    delimiter = '$$'

def indent(line: str, indentation: str) -> str:
    return indentation + line if len(line) > 0 else line

def indent_lines(text: str, indent_size: int) -> str:
    return '\n'.join([
        indent(line, indent_size * ' ')
        for line
        in text.split('\n')
    ])

def get_scripts() -> Tuple[str, str, str]:
    filepath = dirname(realpath(__file__))

    user_filepath = Path(filepath, '..', 'web', 'user.js')
    edit_filepath = Path(filepath, '..', 'web', 'editable.js')
    setup_filepath = Path(filepath, '..', 'web', 'setup.js')

    with open(user_filepath, mode='r', encoding='utf-8') as user_file:
        with open(edit_filepath, mode='r', encoding='utf-8') as edit_file:
            with open(setup_filepath, mode='r', encoding='utf-8') as setup_file:
                return [
                    user_file.read().strip(),
                    edit_file.read().strip(),
                    setup_file.read().strip(),
                ]

def setup_script() -> None:
    if not am:
        return

    user, edit, setup = get_scripts()

    editWithSetup = DoubleTemplate(edit).substitute(
        setupCode=setup,
    )

    def generate_code(id, storage, model, tmpl, pos) -> str:
        closet_version_per_model.model_name = model
        closet_version_per_model.value = version

        return DoubleTemplate(user).substitute(
            editableCode=indent_lines(storage.code if storage.code is not None else editWithSetup, 4),
            cardType='{{Card}}',
            tagsFull='{{Tags}}',
            side='front' if pos == 'question' else 'back',
        )


    lib.make_and_register_interface(
        tag = user_tag,

        getter = lambda id, storage: lib.make_script_v2(
            name = storage.name if storage.name is not None else default_name,
            enabled = storage.enabled if storage.enabled is not None else True,
            type = 'js',
            label = 'closet',
            version = storage.version if storage.version is not None else default_version,
            description = storage.description if storage.description is not None else default_description,
            position = 'into_template',
            conditions = storage.conditions if storage.conditions is not None else [],
            code = storage.code if storage.code is not None else editWithSetup,
        ),

        setter = lambda id, script: True,

        store = ['enabled', 'code', 'version', 'conditions', 'description'],
        readonly = ['name', 'type', 'position'],

        label = lambda id, storage: default_name,

        reset = lambda id, storage: lib.make_script_v2(
            name = storage.name if storage.name else default_name,
            enabled = storage.enabled if storage.enabled else True,
            type = 'js',
            label = 'closet',
            version = storage.version if storage.version else default_version,
            description = storage.description if storage.description is not None else default_description,
            position = 'into_template', # has to be into_template, because it contains {{Cards}} and {{Tags}}
            conditions = storage.conditions if storage.conditions is not None else [],
            code = editWithSetup,
        ),

        generator = generate_code,
    )

def model_has_closet_enabled(model_id: int) -> bool:
    closet_enabled.model_id = model_id
    return closet_enabled.value

def install_script():
    if not am:
        return

    pass_meta_script = lib.make_meta_script(
        user_tag,
        f"{script_name}_id",
    )

    # insert the script for every enabled models
    for mid in filter(model_has_closet_enabled, mw.col.models.ids()):
        lib.register_meta_script(
            mid,
            pass_meta_script,
        )
