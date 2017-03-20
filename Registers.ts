/**
 * Created by Idan Asraf on 19/03/2017.
 */
import {Byte, Word} from "./Primitives";

export type ByteRegister = 'A'|'B'|'C'|'D'|'E'|'H'|'L';

export type WordRegister = 'BC'|'DE'|'HL';

export type PointerRegister = 'SP';

export class Registers {
    /*
     * 8-bit registers.
     */
    private _a : Byte;
    private _b : Byte;
    private _c : Byte;
    private _d : Byte;
    private _e : Byte;
    private _f : Byte;
    private _h : Byte;
    private _l : Byte;

    /*
     * 16-bit registers.
     */
    private _sp : Word;
    private _pc : Word;

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
    public get A() : Byte { return this._a; }
    public set A(value: Byte) { this._a = value & 0xff; }

    public get B() : Byte { return this._b; }
    public set B(value: Byte) { this._b = value & 0xff; }

    public get C() : Byte { return this._c; }
    public set C(value: Byte) { this._c = value & 0xff; }

    public get D() : Byte { return this._d; }
    public set D(value: Byte) { this._d = value & 0xff; }

    public get E() : Byte { return this._e; }
    public set E(value: Byte) { this._e = value & 0xff; }

    public get F() : Byte { return this._f; }
    public set F(value: Byte) { this._f = value & 0xff; }

    public get H() : Byte { return this._h; }
    public set H(value: Byte) { this._h = value & 0xff; }

    public get L() : Byte { return this._l; }
    public set L(value: Byte) { this._l = value & 0xff; }


    /*
     * 16-bit register accessors.
     */
    public get PC() : Word { return this._pc; }
    public set PC(value: Word) { this._pc = value & 0xffff; }

    public get SP() : Word { return this._sp; }
    public set SP(value: Word) { this._sp = value & 0xffff; }
    
    /*
     * Register-duos accessors.
     */
    public get AF() : Word {
        return (this._a << 8) + this._f;
    }

    public set AF(value: Word) {
        this._a = value >> 8;
        this._f = value & 0xff;
    }

    public get BC() : Word {
        return (this._b << 8) + this._c;
    }

    public set BC(value: Word) {
        this._b = value >> 8;
        this._c = value & 0xff;
    }

    public get DE() : Word {
        return (this._d << 8) + this._e;
    }

    public set DE(value: Word) {
        this._d = value >> 8;
        this._e = value & 0xff;
    }

    public get HL(): Word {
        return (this._h << 8) + this._l;
    }

    public set HL(value: Word) {
        this._h = value >> 8;
        this._l = value & 0xff;
    }

    /*
     * @override.
     */
    public toString(): string {
        return `{
            A=${this._a}, B=${this._b}, D=${this._d}, H=${this._h},
            F=${this._f}, C=${this._c}, E=${this._e}, L=${this._l},
            SP=${this._sp}, PC=${this._pc}
        }`;
    }
}

export default Registers;