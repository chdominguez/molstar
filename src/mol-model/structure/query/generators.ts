/**
 * Copyright (c) 2017 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import Query from './query'
import Selection from './selection'
import P from './properties'
import { Structure, AtomSet, Atom } from '../structure'
import { OrderedSet, Segmentation } from 'mol-data/int'

export const all: Query = s => Selection.Singletons(s, s.atoms);

export interface AtomQueryParams {
    entityTest: Atom.Predicate,
    chainTest: Atom.Predicate,
    residueTest: Atom.Predicate,
    atomTest: Atom.Predicate,
    groupBy: Atom.Property<any>
}

export interface AtomGroupsQueryParams extends AtomQueryParams {
    groupBy: Atom.Property<any>
}

export function residues(params?: Partial<AtomQueryParams>) { return atoms({ ...params, groupBy: P.residue.key }); }
export function chains(params?: Partial<AtomQueryParams>) { return atoms({ ...params, groupBy: P.chain.key }); }

export function atoms(params?: Partial<AtomGroupsQueryParams>): Query {
    if (!params || (!params.atomTest && !params.residueTest && !params.chainTest && !params.entityTest && !params.groupBy)) return all;
    if (!!params.atomTest && !params.residueTest && !params.chainTest && !params.entityTest && !params.groupBy) return atomGroupsLinear(params.atomTest);

    const normalized: AtomGroupsQueryParams = {
        entityTest: params.entityTest || P.constant.true,
        chainTest: params.chainTest || P.constant.true,
        residueTest: params.residueTest || P.constant.true,
        atomTest: params.atomTest || P.constant.true,
        groupBy: params.groupBy || P.constant.zero,
    };

    if (!params.groupBy) return atomGroupsSegmented(normalized)
    return atomGroupsGrouped(normalized);
}

function atomGroupsLinear(atomTest: Atom.Predicate): Query {
    return structure => {
        const { atoms, units } = structure;
        const unitIds = AtomSet.unitIds(atoms);
        const l = Atom.Location();
        const builder = AtomSet.LinearBuilder(atoms);

        for (let i = 0, _i = unitIds.length; i < _i; i++) {
            const unitId = unitIds[i];
            l.unit = units[unitId];
            const set = AtomSet.unitGetByIndex(atoms, i).atoms;

            builder.beginUnit();
            for (let j = 0, _j = OrderedSet.size(set); j < _j; j++) {
                l.atom = OrderedSet.getAt(set, j);
                if (atomTest(l)) builder.addToUnit(l.atom);
            }
            builder.commitUnit(unitId);
        }

        return Selection.Singletons(structure, builder.getSet());
    };
}

function atomGroupsSegmented({ entityTest, chainTest, residueTest, atomTest }: AtomGroupsQueryParams): Query {
    return structure => {
        const { atoms, units } = structure;
        const unitIds = AtomSet.unitIds(atoms);
        const l = Atom.Location();
        const builder = AtomSet.LinearBuilder(atoms);

        for (let i = 0, _i = unitIds.length; i < _i; i++) {
            const unitId = unitIds[i];
            const unit = units[unitId];
            l.unit = unit;
            const set = AtomSet.unitGetByIndex(atoms, i).atoms;

            builder.beginUnit();
            const chainsIt = Segmentation.transientSegments(unit.hierarchy.chainSegments, set);
            const residuesIt = Segmentation.transientSegments(unit.hierarchy.residueSegments, set);
            while (chainsIt.hasNext) {
                const chainSegment = chainsIt.move();
                l.atom = OrderedSet.getAt(set, chainSegment.start);
                // test entity and chain
                if (!entityTest(l) || !chainTest(l)) continue;

                residuesIt.setSegment(chainSegment);
                while (residuesIt.hasNext) {
                    const residueSegment = residuesIt.move();
                    l.atom = OrderedSet.getAt(set, residueSegment.start);

                    // test residue
                    if (!residueTest(l)) continue;

                    for (let j = residueSegment.start, _j = residueSegment.end; j < _j; j++) {
                        l.atom = OrderedSet.getAt(set, j);
                        if (atomTest(l)) builder.addToUnit(l.atom);
                    }
                }
            }
            builder.commitUnit(unitId);
        }

        return Selection.Singletons(structure, builder.getSet());
    };
}

class LinearGroupingBuilder {
    private builders: AtomSet.Builder[] = [];
    private builderMap = new Map<string, AtomSet.Builder>();

    add(key: any, unit: number, atom: number) {
        let b = this.builderMap.get(key);
        if (!b) {
            b = AtomSet.LinearBuilder(this.structure.atoms);
            this.builders[this.builders.length] = b;
            this.builderMap.set(key, b);
        }
        b.add(unit, atom);
    }

    private allSingletons() {
        for (let i = 0, _i = this.builders.length; i < _i; i++) {
            if (this.builders[i].atomCount > 1) return false;
        }
        return true;
    }

    private singletonSelection(): Selection {
        const atoms: Atom[] = Atom.createEmptyArray(this.builders.length);
        for (let i = 0, _i = this.builders.length; i < _i; i++) {
            atoms[i] = this.builders[i].singleton();
        }
        return Selection.Singletons(this.structure, AtomSet.ofAtoms(atoms, this.structure.atoms));
    }

    private fullSelection() {
        const sets: AtomSet[] = new Array(this.builders.length);
        for (let i = 0, _i = this.builders.length; i < _i; i++) {
            sets[i] = this.builders[i].getSet();
        }
        return Selection.Sequence(this.structure, sets);
    }

    getSelection(): Selection {
        const len = this.builders.length;
        if (len === 0) return Selection.Empty(this.structure);
        if (this.allSingletons()) return this.singletonSelection();
        return this.fullSelection();
    }

    constructor(private structure: Structure) { }
}

function atomGroupsGrouped({ entityTest, chainTest, residueTest, atomTest, groupBy }: AtomGroupsQueryParams): Query {
    return structure => {
        const { atoms, units } = structure;
        const unitIds = AtomSet.unitIds(atoms);
        const l = Atom.Location();
        const builder = new LinearGroupingBuilder(structure);

        for (let i = 0, _i = unitIds.length; i < _i; i++) {
            const unitId = unitIds[i];
            const unit = units[unitId];
            l.unit = unit;
            const set = AtomSet.unitGetByIndex(atoms, i).atoms;

            const chainsIt = Segmentation.transientSegments(unit.hierarchy.chainSegments, set);
            const residuesIt = Segmentation.transientSegments(unit.hierarchy.residueSegments, set);
            while (chainsIt.hasNext) {
                const chainSegment = chainsIt.move();
                l.atom = OrderedSet.getAt(set, chainSegment.start);
                // test entity and chain
                if (!entityTest(l) || !chainTest(l)) continue;

                residuesIt.setSegment(chainSegment);
                while (residuesIt.hasNext) {
                    const residueSegment = residuesIt.move();
                    l.atom = OrderedSet.getAt(set, residueSegment.start);

                    // test residue
                    if (!residueTest(l)) continue;

                    for (let j = residueSegment.start, _j = residueSegment.end; j < _j; j++) {
                        l.atom = OrderedSet.getAt(set, j);
                        if (atomTest(l)) builder.add(groupBy(l), unitId, l.atom);
                    }
                }
            }
        }

        return builder.getSelection();
    };
}