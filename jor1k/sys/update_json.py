#!/usr/bin/env python3
"""Build fs.json"""
import json
import bz2
import stat
import os
import os.path


def dump_recursive(fout, basefsdir, curdir, relpath, orig_json, indent):
    # Enumerate the files on the filesystem
    fs_files = {}
    if os.path.exists(curdir):
        for name in os.listdir(curdir):
            path = os.path.join(curdir, name)
            st = os.lstat(path)
            if stat.S_ISLNK(st.st_mode):
                print("Warning: unsupported symlink %s" % path)
                continue

            if name.endswith('.bz2'):
                # Compressed file
                with bz2.open(path, 'rb') as cfile:
                    cfile.seek(0, os.SEEK_END)
                    size = cfile.tell()
                name = name[:-4]
                assert name not in fs_files
                fs_files[name] = (st.st_mode, size, True)
            else:
                assert name not in fs_files
                fs_files[name] = (st.st_mode, st.st_size, False)

    # Load data from fs.json
    if orig_json is not None:
        orig_files = dict((x['name'], x) for x in orig_json)
        # Replace virtual names which begins with "." or "_"
        for virtname in list(n for n in orig_files if n[0] in '._'):
            realname = virtname[1:]
            if virtname in ["__init__.py", "_endian.py"]:
                realname = virtname
            else:
                while realname[0] in '._':
                    realname = realname[1:]
                assert realname not in orig_files
            orig_files[realname] = orig_files[virtname]
            del orig_files[virtname]
    else:
        orig_files = {}

    # Merge the list of files with the original fs.json file
    files = set(fs_files.keys())
    files.update(orig_files.keys())

    for idx, realname in enumerate(sorted(files)):
        if realname.endswith(".pyc"):
            continue
        fs_entry = fs_files.get(realname)
        orig_entry = orig_files.get(realname)
        path = os.path.join(curdir, realname)

        # Merge existing files and files in fs.json
        virtname = realname if orig_entry is None else orig_entry['name']
        mode = None if orig_entry is None else int(orig_entry['mode'], 8)
        size = None if orig_entry is None else orig_entry.get('size')
        is_compressed = False
        if fs_entry is not None:
            new_mode, size, is_compressed = fs_entry
            if mode is None:
                mode = new_mode
            else:
                # Keep permission bits but verify the file type
                assert (new_mode >> 12) == (mode >> 12)

        entries = '"name":"%s", "mode":"%o"' % (virtname, mode)

        # Files in $HOME are owned by the user
        if relpath.startswith('/home') or relpath.startswith('/challenges'):
            entries += ', "uid":1000, "gid":1000'

        if stat.S_ISLNK(mode):
            # Symbolic link from original fs.json file
            target = orig_entry['path']
            fout.write('%s{ %s, "path":"%s"}' % (indent, entries, target))
        elif stat.S_ISDIR(mode):
            orig_children = None if orig_entry is None else orig_entry.get('child')
            if not orig_children and not (os.path.exists(path) and os.listdir(path)):
                # Empty directory
                fout.write('%s{ %s, "child":[] }' % (indent, entries))
            else:
                # Regular directory
                fout.write('%s{ %s, "child":[\n' % (indent, entries))
                dump_recursive(fout, basefsdir, path, relpath + '/' + virtname, orig_children, indent + '\t')
                fout.write('%s]}' % (indent))
        else:
            entries += ', "size":%d' % (size)
            if is_compressed:
                entries += ', "c":1'

            # Add an "src" field if there is a virtual path to the resource
            current_relpath = relpath + '/' + virtname
            if not path.endswith(current_relpath):
                assert path.startswith(basefsdir)
                target = path[len(basefsdir):]
                if orig_entry and "src" in orig_entry.keys():
                    assert orig_entry['src'] == target
                entries += ', "src":"%s"' % (target)

            # utils/fs2xml ShouldBeLoaded function
            if virtname in ('libc.so', 'libncurses.so.5.9', 'libmenu.so.5.9', 'libgcc_s.so.1'):
                entries += ', "load":1'

            if orig_entry and not fs_entry:
                print("Warning: deleted file %s" % current_relpath)

            fout.write('%s{ %s}' % (indent, entries))

        # Write a comma only if it is not the last item
        if idx + 1 != len(files):
            fout.write(',\n')
        else:
            fout.write('\n')


def update_json_fs(basedir):
    json_file = os.path.join(basedir, 'fs.json')
    with open(json_file, 'r') as fin:
        fs_json = json.load(fin)
    assert fs_json['src'] and fs_json['fs']
    with open(json_file + '.new', 'w') as fout:
        fout.write('{"src":"%s", "fs":[\n' % (fs_json['src']))
        fsdir = os.path.join(basedir, 'fs')
        dump_recursive(fout, fsdir + '/', fsdir, '', fs_json['fs'], '\t')
        fout.write(']}\n')
    os.rename(json_file + '.new', json_file)

if __name__ == '__main__':
    update_json_fs(os.path.dirname(__file__))
