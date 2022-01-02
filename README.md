## Static File Manager Plugin

This plugin detects new static files in the vault and create a markdown file with the meta data.

Obsidian provides rich features to access markdown files such as
- full text search,
- auto modification of internal links.
On the other hand, by default, 

### Quick start
1. Install and Enable this plugin.
2. Add a static file like `sample.pdf` to your vault.

Then you will find a meta data file `INFO_sample_PDF.md` in the root directory.
You can customize the templates for names and contents of meta data files.

### Format syntax
You can use the following syntax to format the name and content of meta data files.
#### Date
| Syntax | Description |
| -- | -- |
| {{CDATE:<FORMAT>}} | Creation time of the static file  |
| {{NOW:<FORMAT>}} | Current time |

- Replace `<FORMAT>` by a [Moment.js format](https://momentjs.com/docs/#/displaying/format/).

#### Path
| Syntax | Description |
| -- | -- |
| {{PATH}} | Path of a static file |
| {{FULLNAME}} | Name of a static file |
| {{NAME}} | Name of a static file with extension removed |
| {{EXTENSION}} | Extension of a static file |

- You can choose between uppercase and lowercase letters by suffixing `:UP` and `:LOW`, respectively. For example, `{{NAME:UP}}`.

### Use Templater plugin
You can also use [Templater plugin](https://github.com/SilentVoid13/Templater) to format your meta data files.
The only thing you have to do is install Templater plugin and set `Use Templater` in the setting tab of Static File Manager.
