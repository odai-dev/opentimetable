/* tslint:disable */
/* eslint-disable */

export class WasmSolverSession {
    free(): void;
    [Symbol.dispose](): void;
    get_solution(): string;
    constructor(request_json: string);
    step(iterations: number): string;
}

export function allocate_classrooms(request_json: string): string;

export function allocate_classrooms_js(val: any): any;

export function get_benchmark_500_request(seed?: bigint | null): string;

export function init(): void;

export function solve_timetable(request_json: string): string;

export function solve_timetable_js(val: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmsolversession_free: (a: number, b: number) => void;
    readonly allocate_classrooms: (a: number, b: number) => [number, number, number, number];
    readonly allocate_classrooms_js: (a: any) => [number, number, number];
    readonly get_benchmark_500_request: (a: number, b: bigint) => [number, number, number, number];
    readonly init: () => void;
    readonly solve_timetable: (a: number, b: number) => [number, number, number, number];
    readonly solve_timetable_js: (a: any) => [number, number, number];
    readonly wasmsolversession_get_solution: (a: number) => [number, number, number, number];
    readonly wasmsolversession_new: (a: number, b: number) => [number, number, number];
    readonly wasmsolversession_step: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
