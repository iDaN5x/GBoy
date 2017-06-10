/**
 * Created by Idan Asraf on 19/03/2017.
 */
import {UByte, UWord} from "../Primitives";

export type ByteRegister = 'A'|'B'|'C'|'D'|'E'|'H'|'L';
export type WordRegister = 'BC'|'DE'|'HL'|'AF';
export type PointerRegister = 'SP'|'PC';

export class Registers {
    /*
     * 8-bit registers.
     */
    private _a: UByte;
    private _b: UByte;
    private _c: UByte;
    private _d: UByte;
    private _e: UByte;
    private _f: UByte;
    private _h: UByte;
    private _l: UByte;

    /*
     * 16-bit registers.
     */
    private _sp: UWord;
    private _pc: UWord;

    /*
     * Component initialization.
     */
    public constructor() { this.Reset(); }

    public Reset() : void {
        // Reset 8-bit registers.
        this._a = 0x00;
        this._b = 0x00;
        this._c = 0x00;
        this._d = 0x00;
        this._e = 0x00;
        this._f = 0x00;
        this._h = 0x00;
        this._l = 0x00;

        // Reset 16-bit registers.
        this._sp = 0xfffe;
        this._pc = 0x0000;
    }

    /*
     * 8-bit register accessors.
     */
    public get A() : UByte {
        return this._a;
    }

    public set A(value: UByte) {
        this._a = value & 0xff;
    }

    public get B() : UByte {
        return this._b;
    }

    public set B(value: UByte) {
        this._b = value & 0xff;
    }

    public get C() : UByte {
        return this._c;
    }

    public set C(value: UByte) {
        this._c = value & 0xff;
    }

    public get D() : UByte {
        return this._d;
    }

    public set D(value: UByte) {
        this._d = value & 0xff;
    }

    public get E() : UByte {
        return this._e;
    }

    public set E(value: UByte) {
        this._e = value & 0xff;
    }

    public get F() : UByte {
        return this._f;
    }

    public set F(value: UByte) {
        this._f = value & 0xff;
    }

    public get H() : UByte {
        return this._h;
    }

    public set H(value: UByte) {
        this._h = value & 0xff;
    }

    public get L() : UByte {
        return this._l;
    }

    public set L(value: UByte) {
        this._l = value & 0xff;
    }

    /*
     * 16-bit register accessors.
     */
    public get PC() : UWord {
        return this._pc;
    }

    public set PC(value: UWord) {
        this._pc = value & 0xffff;
    }

    public get SP() : UWord {
        return this._sp;
    }

    public set SP(value: UWord) {
        this._sp = value & 0xffff;
    }

    /*
     * Register-duos accessors.
     */
    public get AF() : UWord {
        return (this._a << 8) + this._f;
    }

    public set AF(value: UWord) {
        this._a = value >> 8;
        this._f = value & 0xff;
    }

    public get BC() : UWord {
        return (this._b << 8) + this._c;
    }

    public set BC(value: UWord) {
        this._b = value >> 8;
        this._c = value & 0xff;
    }

    public get DE() : UWord {
        return (this._d << 8) + this._e;
    }

    public set DE(value: UWord) {
        this._d = value >> 8;
        this._e = value & 0xff;
    }

    public get HL() : UWord {
        return (this._h << 8) + this._l;
    }

    public set HL(value: UWord) {
        this._h = value >> 8;
        this._l = value & 0xff;
    }

    /*
     * @override.
     */
    public toString() : string {
        return `{
            A=${this._a}, B=${this._b}, D=${this._d}, H=${this._h},
            F=${this._f}, C=${this._c}, E=${this._e}, L=${this._l},
            SP=${this._sp}, PC=${this._pc}
        }`;
    }
}

export default Registers;