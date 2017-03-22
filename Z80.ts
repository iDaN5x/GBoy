/**
 * Created by Idan Asraf on 19/03/2017.
 */
import {Registers, ByteRegister, WordRegister, PointerRegister} from "./Registers";
import {Byte, Word, NBit} from "./Primitives";
import {Memory} from "./Memory";
import {Flags} from "./Flags";

enum InterruptsState { Enabling, Enabled, Disabling, Disabled }

export class Z80 {
    private _regs: Registers;
    private _mem: Memory;

    private _interrupts: InterruptsState;

    private _halt: boolean;
    private _stop: boolean;

    /*
     * Component initialization.
     */
    public constructor() {
        this._regs = new Registers();
        this._mem = new Memory();
    }

    public Reset() : void {
        this._regs.Reset();
        this._mem.Reset();
        this._halt = false;
    }

    public Start() : void {
        // If _interrupts is Disabling/Enabling, after instruction set to Disbaled/Enabled.
    }

    /*
     * Flags handling.
     */
    private _hasFlag(flag: Flags) : boolean {
        return Boolean(this._regs.F & flag);
    }

    private _setFlag(flag: Flags, state: boolean = true) {
        if (state) this._regs.F |= flag;
        else       this._regs.F &= ~flag;
    }

    private _unsetFlag(flag: Flags) : void {
        this._setFlag(flag, false);
    }

    private _resetFlags() : void {
        this._regs.F &= 0x0f;
    }

    /*
     * Operand fetching.
     */
    private _fetchByte() : Byte {
        return this._mem.Read(this._regs.PC++);
    }

    private _fetchSignedByte() : Byte {
        let op = this._fetchByte();

        if (op < 128) return op;
        else          return -(op & 0b01111111);
    }

    private _fetchWord() : Word {
        let res = this._mem.ReadWord(this._regs.PC);
        this._regs.PC += 2;
        return res;
    }

    /*
     * 8-bit Load operations.
     */
    private _LD_r1_r2(r1: ByteRegister, r2: ByteRegister) : void {
        this._regs[r1] = this._regs[r2];
    }

    private _LD_r_n(r: ByteRegister) : void {
        this._regs[r] = this._fetchByte();
    }

    private _LD_r_$HL(r: ByteRegister) : void {
        this._regs[r] = this._mem.Read(this._regs.HL);
    }

    private _LD_$HL_r(r: ByteRegister) : void {
        this._mem.Write(this._regs.HL, this._regs[r]);
    }

    private _LD_$HL_n() : void {
        this._mem.Write(this._regs.HL, this._fetchByte());
    }

    private _LD_A_$rr(rr: WordRegister) : void {
        this._regs.A = this._mem.Read(this._regs[rr]);
    }

    private _LD_A_$nn() : void {
        this._regs.A = this._mem.Read(this._fetchWord());
    }

    private _LD_$rr_A(rr: WordRegister) : void {
        this._mem.Write(this._regs[rr], this._regs.A);
    }

    private _LD_$nn_A() : void {
        this._mem.Write(this._fetchWord(), this._regs.A);
    }

    private _LD_A_$C() : void {
        this._regs.A = this._mem.Read(0xff00 + this._regs.C);
    }

    private _LD_$C_A() : void {
        this._mem.Write(0xff00 + this._regs.C, this._regs.A);
    }

    private _LDD_A_$HL() : void {
        this._regs.A = this._mem.Read(this._regs.HL--);
    }

    private _LDD_$HL_A() : void {
        this._mem.Write(this._regs.HL--, this._regs.A);
    }

    private _LDI_A_$HL() : void {
        this._regs.A = this._mem.Read(this._regs.HL++);
    }

    private _LDI_$HL_A() : void {
        this._mem.Write(this._regs.HL++, this._regs.A);
    }

    private _LDH_$n_A() : void {
        this._mem.Write(0xff00 + this._fetchByte(), this._regs.A);
    }

    private _LD_A_$n() : void {
        this._regs.A = this._mem.Read(0xff00 + this._fetchByte());
    }

    /*
     * 16-bit Load operations.
     */
    private _LD_dd_nn(dd: WordRegister|PointerRegister) : void {
        this._regs[dd] = this._fetchWord();
    }

    private _LD_$nn_SP() : void {
        this._mem.WriteWord(this._fetchWord(), this._regs.SP);
    }

    private _LD_SP_HL() : void {
        this._regs.SP = this._regs.HL;
    }

    private _LD_HL_$SPe() : void {
        let e = this._fetchSignedByte(),
            add = this._regs.SP + e;

        this._regs.HL = this._mem.ReadWord(add);

        // TODO: Carry of word? byte?.
        this._setFlag(Flags.Carry, add > 0xffff);
        // TODO: Half carry of byte? nibble?.
        //this._setFlag(Flags.HalfCarry, );
        this._unsetFlag(Flags.Zero | Flags.Negative);
    }

    private _PUSH_ss(ss: WordRegister) : void {
        this._mem.WriteWord(this._regs.SP, this._regs[ss]);
        this._regs.SP -= 2;
    }

    private _POP_dd(dd: WordRegister) : void {
        this._regs[dd] = this._mem.ReadWord(this._regs.SP);
        this._regs.SP += 2;
    }

    /*
     * 8-bit ALU.
     */
    private _ADC_A_s(s: Byte, cy = false) : void {
        let A_low = this._regs.A & 0x0f,
            s_low = s & 0x0f,
            c = +cy;

        let res = this._regs.A + s + c;
        this._regs.A = res;

        this._setFlag(Flags.Carry, res > 0xff);
        this._setFlag(Flags.HalfCarry, A_low + s_low + c > 0x0f);
        this._setFlag(Flags.Zero, this._regs.A == 0);
        this._unsetFlag(Flags.Negative);
    }

    private _ADD_A_r(r: ByteRegister) : void {
        this._ADC_A_s(this._regs[r]);
    }

    private _ADD_A_n() : void {
        this._ADC_A_s(this._fetchByte());
    }

    private _ADD_A_$HL() : void {
        this._ADC_A_s(this._mem.Read(this._regs.HL));
    }

    private _ADC_A_r(r: ByteRegister) : void {
        this._ADC_A_s(this._regs[r], this._hasFlag(Flags.Carry));
    }

    private _ADC_A_n() : void {
        this._ADC_A_s(this._fetchByte(), this._hasFlag(Flags.Carry));
    }

    private _ADC_A_$HL() : void {
        this._ADC_A_s(this._mem.Read(this._regs.HL), this._hasFlag(Flags.Carry));
    }

    private _SBC_A_s(s: Byte, cy = false) : void {
        let A_low = this._regs.A & 0x0f,
            s_low = s & 0x0f,
            c = +cy;

        let res = this._regs.A - s - c;
        this._regs.A = res;

        this._setFlag(Flags.Carry, res < 0);
        this._setFlag(Flags.HalfCarry, A_low - s_low - c < 0);
        this._setFlag(Flags.Zero, this._regs.A == 0);
        this._unsetFlag(Flags.Negative);
    }

    private _SUB_A_r(r: ByteRegister) : void {
        this._SBC_A_s(this._regs[r]);
    }

    private _SUB_A_n() : void {
        this._SBC_A_s(this._fetchByte());
    }

    private _SUB_A_$HL() : void {
        this._SBC_A_s(this._mem.Read(this._regs.HL));
    }

    private _SBC_A_r(r: ByteRegister) : void {
        this._SBC_A_s(this._regs[r], this._hasFlag(Flags.Carry));
    }

    private _SBC_A_n() : void {
        this._SBC_A_s(this._fetchByte(), this._hasFlag(Flags.Carry));
    }

    private _SBC_A_$HL() : void {
        this._SBC_A_s(this._mem.Read(this._regs.HL), this._hasFlag(Flags.Carry));
    }

    private _AND_s(s: Byte) : void {
        this._regs.A &= s;

        this._setFlag(Flags.HalfCarry);
        this._unsetFlag(Flags.Carry | Flags.Negative);
        this._setFlag(Flags.Zero, this._regs.A == 0);
    }

    private _AND_r(r: ByteRegister) : void {
        this._AND_s(this._regs[r]);
    }

    private _AND_n(r: ByteRegister) : void {
        this._AND_s(this._fetchByte());
    }

    private _AND_$HL(r: ByteRegister) : void {
        this._AND_s(this._mem.Read(this._regs.HL));
    }

    private _OR_s(s: Byte) : void {
        this._regs.A |= s;

        this._unsetFlag(Flags.Carry | Flags.HalfCarry | Flags.Negative);
        this._setFlag(Flags.Zero, this._regs.A == 0);
    }

    private _OR_r(r: ByteRegister) : void {
        this._OR_s(this._regs[r]);
    }

    private _OR_n(r: ByteRegister) : void {
        this._OR_s(this._fetchByte());
    }

    private _OR_$HL(r: ByteRegister) : void {
        this._OR_s(this._mem.Read(this._regs.HL));
    }

    private _XOR_s(s: Byte) : void {
        this._regs.A ^= s;

        this._unsetFlag(Flags.Carry | Flags.HalfCarry | Flags.Negative);
        this._setFlag(Flags.Zero, this._regs.A == 0);
    }

    private _XOR_r(r: ByteRegister) : void {
        this._XOR_s(this._regs[r]);
    }

    private _XOR_n(r: ByteRegister) : void {
        this._XOR_s(this._fetchByte());
    }

    private _XOR_$HL(r: ByteRegister) : void {
        this._XOR_s(this._mem.Read(this._regs.HL));
    }

    private _CP_s(s: Byte) : void {
        let A_low = this._regs.A & 0x0f,
            s_low = s & 0x0f;

        let res = this._regs.A - s;

        this._setFlag(Flags.Carry, res < 0);
        this._setFlag(Flags.HalfCarry, A_low - s_low < 0);
        this._setFlag(Flags.Zero, (res & 0xff) == 0);
        this._unsetFlag(Flags.Negative);
    }

    private _CP_r(r: ByteRegister) : void {
        this._CP_s(this._regs[r]);
    }

    private _CP_n() : void {
        this._CP_s(this._fetchByte());
    }

    private _CP_$HL() : void {
        this._CP_s(this._mem.Read(this._regs.HL));
    }

    private _INC_r(r: ByteRegister) : void {
        let res = this._regs[r] += 1;

        this._setFlag(Flags.HalfCarry, (res & 0x0f) == 0);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.Negative);
    }

    private _INC_$HL() : void {
        let res = this._mem.Read(this._regs.HL) + 1;
        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.HalfCarry, (res & 0x0f) == 0);
        this._setFlag(Flags.Zero, (res & 0xff) == 0);
        this._unsetFlag(Flags.Negative);
    }

    private _DEC_r(r: ByteRegister) : void {
        let res = this._regs[r] -= 1;

        this._setFlag(Flags.HalfCarry, (res & 0x0f) == 0x0f);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.Negative);
    }

    private _DEC_$HL() : void {
        let res = this._mem.Read(this._regs.HL) - 1;
        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.HalfCarry, (res & 0x0f) == 0x0f);
        this._setFlag(Flags.Zero, (res & 0xff) == 0);
        this._setFlag(Flags.Negative);
    }

    /*
     * 16-bit Arithmetic operations.
     */
    private _ADD_HL_ss(ss: WordRegister|PointerRegister) : void {
        let hl_sec = this._regs.HL & 0x0fff,
            s_sec = this._regs[ss] & 0x0fff;

        let res = this._regs.HL + this._regs[ss];
        this._regs.HL = res;

        this._setFlag(Flags.Carry, res > 0xffff);
        this._setFlag(Flags.HalfCarry, hl_sec + s_sec > 0x0fff);
        this._unsetFlag(Flags.Negative);
    }

    private _ADD_SP_e() : void {
        let e = this._fetchSignedByte();

        let res = this._regs.SP + e;
        this._regs.SP = res;

        // TODO: Carry of word? byte?.
        this._setFlag(Flags.Carry, res > 0xffff);
        // TODO: Half carry of byte? nibble?.
        //this._setFlag(Flags.HalfCarry, );
        this._unsetFlag(Flags.Zero | Flags.Negative);
    }

    private _INC_ss(ss: WordRegister|PointerRegister) : void {
        this._regs[ss] += 1;
    }

    private _DEC_ss(ss: WordRegister|PointerRegister) : void {
        this._regs[ss] -= 1;
    }

    /*
     * Miscellaneous operations.
     */
    private _SWAP_r(r: ByteRegister) : void {
        let op = this._regs[r];

        this._regs[r] = (op >> 4) + (op << 4);

        this._resetFlags();
        this._setFlag(Flags.Zero, this._regs[r] == 0);
    }

    private _SWAP_$HL() : void {
        let op = this._mem.Read(this._regs.HL);

        let res = (op >> 4) + (op << 4);

       this._mem.Write(this._regs.HL, res);

        this._resetFlags();
        this._setFlag(Flags.Zero, (res & 0xff) == 0);
    }

    private _DAA() : void {
        // TODO: implement.
    }

    private _CPL() : void {
        this._regs.A = ~this._regs.A;

        this._setFlag(Flags.Negative | Flags.HalfCarry);
    }

    private _CCF() : void {
        this._setFlag(Flags.Carry, !this._hasFlag(Flags.Carry));
        this._unsetFlag(Flags.Negative | Flags.HalfCarry);
    }

    private _SCF() : void {
        this._setFlag(Flags.Carry);
        this._unsetFlag(Flags.Negative | Flags.HalfCarry);
    }

    private _NOP() : void {}

    private _HALT() : void {
        // TODO: extra logic?
        this._halt = true;
    }

    private _STOP() : void {
        // TODO: extra logic?
        this._halt = true;
        this._stop = true;
    }

    private _DI() : void {
        this._interrupts = InterruptsState.Disabling;
    }

    private _EI() : void {
        this._interrupts = InterruptsState.Enabling;
    }

    /*
     * Rotate & Shift operations.
     */
    private _RLC_r(r: ByteRegister) : void {
        let msb = this._regs[r] >> 7;

        this._regs[r] = (this._regs[r] << 1) + msb;

        this._setFlag(Flags.Carry, msb == 1);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RLC_$HL() : void {
        let op = this._mem.Read(this._regs.HL);

        let msb = op >> 7;
        let res = (op << 1) + msb;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb == 1);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RL_r(r: ByteRegister) : void {
        let cy = +this._hasFlag(Flags.Carry),
            msb = this._regs[r] >> 7;

        this._regs[r] = (this._regs[r] << 1) + cy;

        this._setFlag(Flags.Carry, msb == 1);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RL_$HL() : void {
        let op = this._mem.Read(this._regs.HL),
            cy = +this._hasFlag(Flags.Carry);

        let res = (op << 1) + cy,
            msb = op >> 7;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb == 1);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RRC_r(r: ByteRegister) : void {
        let lsb = this._regs[r] << 7;

        this._regs[r] = (this._regs[r] >> 1) + lsb;

        this._setFlag(Flags.Carry, lsb > 0);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RRC_$HL() : void {
        let op = this._mem.Read(this._regs.HL);

        let lsb = op << 7;
        let res = (op >> 1) + lsb;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, lsb > 0);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RR_r(r: ByteRegister) : void {
        let cy = +this._hasFlag(Flags.Carry),
            lsb = this._regs[r] & 0b00000001;

        this._regs[r] = (this._regs[r] >> 1) + cy;

        this._setFlag(Flags.Carry, lsb == 1);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RR_$HL() : void {
        let op = this._mem.Read(this._regs.HL),
            cy = +this._hasFlag(Flags.Carry);

        let res = (op >> 1) + cy,
            lsb = op & 0b00000001;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, lsb == 1);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SLA_r(r: ByteRegister) : void {
        let msb = this._regs[r] >> 7;

        this._regs[r] <<= 1;

        this._setFlag(Flags.Carry, msb == 1);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SLA_$HL() : void {
        let op = this._mem.Read(this._regs.HL);

        let res =  op << 1,
            msb = op >> 7;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb == 1);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRA_r(r: ByteRegister) : void {
        let msb = this._regs[r] & 0b10000000;

        this._regs[r] = (this._regs[r] >> 1) + msb;

        this._setFlag(Flags.Carry, msb > 0);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRA_$HL() : void {
        let op = this._mem.Read(this._regs.HL);

        let msb = op & 0b10000000;
        let res = (op >> 1) + msb;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb > 0);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRL_r(r: ByteRegister) : void {
        let lsb = this._regs[r] & 0b00000001;

        this._regs[r] >>= 1;

        this._setFlag(Flags.Carry, lsb == 1);
        this._setFlag(Flags.Zero, this._regs[r] == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRL_$HL() : void {
        let op = this._mem.Read(this._regs.HL);

        let res =  op >> 1,
            lsb = op & 0b00000001;

        this._mem.Write(this._regs.HL, res);

        this._setFlag(Flags.Carry, lsb == 1);
        this._setFlag(Flags.Zero, res == 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    /*
     * Bit operations.
     */
    private _BIT_x_r(b: NBit, r: ByteRegister) : void {
        let musk = 1 << b;

        this._setFlag(Flags.HalfCarry);
        this._unsetFlag(Flags.Negative);
        this._setFlag(Flags.Zero, (this._regs[r] & musk) == 0)
    }

    private _BIT_b_$HL(b: NBit) : void {
        let op = this._mem.Read(this._regs.HL),
            musk = 1 << b;

        this._setFlag(Flags.HalfCarry);
        this._unsetFlag(Flags.Negative);
        this._setFlag(Flags.Zero, (op & musk) == 0)
    }

    private _SET_b_r(b: NBit, r: ByteRegister) : void {
        this._regs[r] |= (1 << b);
    }

    private _SET_b_$HL(b: NBit) : void {
        let op = this._mem.Read(this._regs.HL),
            set = 1 << b;

        this._mem.Write(this._regs.HL, op | set);
    }

    private _RES_b_r(b: NBit, r: ByteRegister) : void {
        this._regs[r] &= ~(1 << b);
    }

    private _RES_b_$HL(b: NBit) : void {
        let op = this._mem.Read(this._regs.HL),
            reset = ~(1 << b);

        this._mem.Write(this._regs.HL, op & reset);
    }

    /*
     * Jump operations.
     */
    private _JP_nn() : void {
        this._regs.PC = this._fetchWord();
    }

    private _JP_Z_nn() : void {
        if (this._hasFlag(Flags.Zero)) {
            this._regs.PC = this._fetchWord();
        }
    }

    private _JP_NZ_nn() : void {
        if (!this._hasFlag(Flags.Zero)) {
            this._regs.PC = this._fetchWord();
        }
    }

    private _JP_C_nn() : void {
        if (this._hasFlag(Flags.Carry)) {
            this._regs.PC = this._fetchWord();
        }
    }

    private _JP_NC_nn() : void {
        if (!this._hasFlag(Flags.Carry)) {
            this._regs.PC = this._fetchWord();
        }
    }

    private _JP_HL() : void {
        this._regs.PC = this._regs.HL;
    }

    private _JR_e() : void {
        this._regs.PC += this._fetchSignedByte();
    }

    private _JP_Z_e() : void {
        if (this._hasFlag(Flags.Zero)) {
            this._regs.PC += this._fetchSignedByte();
        }
    }

    private _JP_NZ_e() : void {
        if (!this._hasFlag(Flags.Zero)) {
            this._regs.PC += this._fetchSignedByte();
        }
    }

    private _JP_C_e() : void {
        if (this._hasFlag(Flags.Carry)) {
            this._regs.PC += this._fetchSignedByte();
        }
    }

    private _JP_NC_e() : void {
        if (!this._hasFlag(Flags.Carry)) {
            this._regs.PC += this._fetchSignedByte();
        }
    }

    /*
     * Call operations.
     */
    private _CALL_nn() : void {
        this._mem.WriteWord(this._regs.SP, this._regs.PC);

        this._regs.SP -= 2;
        this._regs.PC = this._fetchWord();
    }

    private _CALL_Z_nn() : void {
        if (this._hasFlag(Flags.Zero)) {
            this._CALL_nn();
        }
    }

    private _CALL_NZ_nn() : void {
        if (!this._hasFlag(Flags.Zero)) {
            this._CALL_nn();
        }
    }

    private _CALL_C_nn() : void {
        if (this._hasFlag(Flags.Carry)) {
            this._CALL_nn();
        }
    }

    private _CALL_NC_nn() : void {
        if (!this._hasFlag(Flags.Carry)) {
            this._CALL_nn();
        }
    }
}

export default Z80;