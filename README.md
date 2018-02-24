[![License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](./LICENSE)
[![Build Status](https://travis-ci.org/mol-star/mol-star-proto.svg?branch=master)](https://travis-ci.org/mol-star/mol-star-proto)

# Mol*

The goal of **Mol\*** (*/'mol-star/*) is to provide a technology stack that will serve as basis for the next-generation data delivery and analysis tools for macromolecular structure data. This is a collaboration between PDBe and RCSB PDB teams and the development will be open source and available to anyone who wants to use it for developing visualisation tools for macromolecular structure data available from [PDB](https://www.wwpdb.org/) and other institutions.

This particular project is a prototype implementation of this technology (still under development).

## Project Overview

The core of Mol* currently consists of these modules:

- `mol-task` Computation abstraction with progress tracking and cancellation support.
- `mol-data` Collections (integer based sets, interface to columns/tables, etc.)
- `mol-math` Math related (loosely) algorithms and data structures.
- `mol-io` Parsing library. Each format is parsed into an interface that corresponds to the data stored by it. Support for common coordinate, experimental/map, and annotation data formats.
- `mol-model` Data structures and algorithms (such as querying) for representing molecular data (including coordinate, experimental/map, and annotation data).
- `mol-ql` Mapping of `mol-model` to the [MolQL query language](https://molql.github.io) spec.
- `mol-util` Useful things that do not fit elsewhere.

The project also contains performance tests (`perf-tests`), `examples`, and basic proof of concept `apps` (CIF to BinaryCIF converter and JSON domain annotation to CIF converter).

## Previous Work
This project builds on experience from previous solutions:
- [LiteMol Suite](https://www.litemol.org)
- [WebChemistry](https://webchem.ncbr.muni.cz)
- [NGL Viewer](http://nglviewer.org)
- [MMTF](http://mmtf.rcsb.org)
- [MolQL](http://molql.org)
- [PDB Component Library](https://www.ebi.ac.uk/pdbe/pdb-component-library/)
- And many others (list will be continuously expanded).

## Building & Running

### Build:
   npm install
   npm run build

### Build automatically on file save:
   npm run watch

### Run test script from src/script.ts
   npm run script

## Contributing
Just open an issue or make a pull request. All contributions are welcome.

## Roadmap
Continually develop this prototype project. As individual modules become stable, make them into standalone libraries.
