/**
 * Created by Idan Asraf on 19/03/2017.
 */
import {Registers, ByteRegister, WordRegister, PointerRegister} from "./Registers";
import {Memory, PageZeroLocation} from "../Memory";
import {UByte, UWord, NBit, Byte, Word} from "../Primitives";
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
        if (state) {
            this._regs.F |= flag;
        } else {
            this._regs.F &= ~flag;
        }
    }

    private _unsetFlag(flag: Flags) : void {
        this._setFlag(flag, false);
    }

    private _resetFlags() : void {
        this._regs.F &= 0x0f;
    }

    /*
     * Stack handling.
     */
    private _stackPush(value: UWord) : void {
        this._mem.WriteWord(this._regs.SP, value);
        this._regs.SP -= 2;
    }

    private _stackPop() : UWord {
        const res = this._mem.ReadWord(this._regs.SP);
        this._regs.SP += 2;
        return res;
    }

    /*
     * Operand handling.
     */
    private _fetchUByte() : UByte {
        return this._mem.ReadUByte(this._regs.PC++);
    }

    private _fetchByte() : Byte {
        return this._mem.ReadByte(this._regs.PC++);
    }

    private _fetchUWord() : UWord {
        const res = this._mem.ReadUWord(this._regs.PC);
        this._regs.PC += 2;
        return res;
    }

    private _fetchWord() : Word {
        const res = this._mem.ReadWord(this._regs.PC);
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
        this._regs[r] = this._fetchUByte();
    }

    private _LD_r_$HL(r: ByteRegister) : void {
        this._regs[r] = this._mem.ReadByte(this._regs.HL);
    }

    private _LD_$HL_r(r: ByteRegister) : void {
        this._mem.WriteByte(this._regs.HL, this._regs[r]);
    }

    private _LD_$HL_n() : void {
        this._mem.WriteByte(this._regs.HL, this._fetchUByte());
    }

    private _LD_A_$rr(rr: WordRegister) : void {
        this._regs.A = this._mem.ReadByte(this._regs[rr]);
    }

    private _LD_A_$nn() : void {
        this._regs.A = this._mem.ReadByte(this._fetchUWord());
    }

    private _LD_$rr_A(rr: WordRegister) : void {
        this._mem.WriteByte(this._regs[rr], this._regs.A);
    }

    private _LD_$nn_A() : void {
        this._mem.WriteByte(this._fetchUWord(), this._regs.A);
    }

    private _LD_A_$C() : void {
        this._regs.A = this._mem.ReadByte(0xff00 + this._regs.C);
    }

    private _LD_$C_A() : void {
        this._mem.WriteByte(0xff00 + this._regs.C, this._regs.A);
    }

    private _LDD_A_$HL() : void {
        this._regs.A = this._mem.ReadByte(this._regs.HL--);
    }

    private _LDD_$HL_A() : void {
        this._mem.WriteByte(this._regs.HL--, this._regs.A);
    }

    private _LDI_A_$HL() : void {
        this._regs.A = this._mem.ReadByte(this._regs.HL++);
    }

    private _LDI_$HL_A() : void {
        this._mem.WriteByte(this._regs.HL++, this._regs.A);
    }

    private _LDH_$n_A() : void {
        this._mem.WriteByte(0xff00 + this._fetchUByte(), this._regs.A);
    }

    private _LD_A_$n() : void {
        this._regs.A = this._mem.ReadByte(0xff00 + this._fetchUByte());
    }

    /*
     * 16-bit Load operations.
     */
    private _LD_dd_nn(dd: WordRegister|PointerRegister) : void {
        this._regs[dd] = this._fetchUWord();
    }

    private _LD_$nn_SP() : void {
        this._mem.WriteWord(this._fetchUWord(), this._regs.SP);
    }

    private _LD_SP_HL() : void {
        this._regs.SP = this._regs.HL;
    }

    private _LD_HL_$SPe() : void {
        const e = this._fetchByte(),
              add = this._regs.SP + e;

        const spNib = this._regs.SP & 0x000f,
              eNib = e & 0x0f;

        this._regs.HL = this._mem.ReadWord(add);

        this._setFlag(Flags.Carry, add > 0xffff);
        this._setFlag(Flags.HalfCarry, spNib + eNib > 0x0f);
        this._unsetFlag(Flags.Zero | Flags.Negative);
    }

    private _PUSH_ss(ss: WordRegister) : void {
        this._stackPush(this._regs[ss]);
    }

    private _POP_dd(dd: WordRegister) : void {
        this._regs[dd] = this._stackPop();
    }

    /*
     * 8-bit ALU.
     */
    private _ADCy_A_s(s: UByte, cy = false) : void {
        const A_low = this._regs.A & 0x0f,
              s_low = s & 0x0f,
              c = +cy;

        const res = this._regs.A + s + c;
        this._regs.A = res;

        this._setFlag(Flags.Carry, res > 0xff);
        this._setFlag(Flags.HalfCarry, A_low + s_low + c > 0x0f);
        this._setFlag(Flags.Zero, this._regs.A === 0);
        this._unsetFlag(Flags.Negative);
    }

    private _ADD_A_r(r: ByteRegister) : void {
        this._ADCy_A_s(this._regs[r]);
    }

    private _ADD_A_n() : void {
        this._ADCy_A_s(this._fetchUByte());
    }

    private _ADD_A_$HL() : void {
        this._ADCy_A_s(this._mem.ReadByte(this._regs.HL));
    }

    private _ADC_A_r(r: ByteRegister) : void {
        this._ADCy_A_s(this._regs[r], this._hasFlag(Flags.Carry));
    }

    private _ADC_A_n() : void {
        this._ADCy_A_s(this._fetchUByte(), this._hasFlag(Flags.Carry));
    }

    private _ADC_A_$HL() : void {
        this._ADCy_A_s(
            this._mem.ReadByte(this._regs.HL),
            this._hasFlag(Flags.Carry)
        );
    }

    private _SBCy_A_s(s: UByte, cy = false) : void {
        const A_low = this._regs.A & 0x0f,
              s_low = s & 0x0f,
              c = +cy;

        const res = this._regs.A - s - c;
        this._regs.A = res;

        this._setFlag(Flags.Carry, res < 0);
        this._setFlag(Flags.HalfCarry, A_low - s_low - c < 0);
        this._setFlag(Flags.Zero, this._regs.A === 0);
        this._unsetFlag(Flags.Negative);
    }

    private _SUB_A_r(r: ByteRegister) : void {
        this._SBCy_A_s(this._regs[r]);
    }

    private _SUB_A_n() : void {
        this._SBCy_A_s(this._fetchUByte());
    }

    private _SUB_A_$HL() : void {
        this._SBCy_A_s(this._mem.ReadByte(this._regs.HL));
    }

    private _SBC_A_r(r: ByteRegister) : void {
        this._SBCy_A_s(this._regs[r], this._hasFlag(Flags.Carry));
    }

    private _SBC_A_n() : void {
        this._SBCy_A_s(this._fetchUByte(), this._hasFlag(Flags.Carry));
    }

    private _SBC_A_$HL() : void {
        this._SBCy_A_s(
            this._mem.ReadByte(this._regs.HL),
            this._hasFlag(Flags.Carry)
        );
    }

    private _AND_s(s: UByte) : void {
        this._regs.A &= s;

        this._setFlag(Flags.HalfCarry);
        this._unsetFlag(Flags.Carry | Flags.Negative);
        this._setFlag(Flags.Zero, this._regs.A === 0);
    }

    private _AND_r(r: ByteRegister) : void {
        this._AND_s(this._regs[r]);
    }

    private _AND_n(r: ByteRegister) : void {
        this._AND_s(this._fetchUByte());
    }

    private _AND_$HL(r: ByteRegister) : void {
        this._AND_s(this._mem.ReadByte(this._regs.HL));
    }

    private _OR_s(s: UByte) : void {
        this._regs.A |= s;

        this._unsetFlag(Flags.Carry | Flags.HalfCarry | Flags.Negative);
        this._setFlag(Flags.Zero, this._regs.A === 0);
    }

    private _OR_r(r: ByteRegister) : void {
        this._OR_s(this._regs[r]);
    }

    private _OR_n(r: ByteRegister) : void {
        this._OR_s(this._fetchUByte());
    }

    private _OR_$HL(r: ByteRegister) : void {
        this._OR_s(this._mem.ReadByte(this._regs.HL));
    }

    private _XOR_s(s: UByte) : void {
        this._regs.A ^= s;

        this._unsetFlag(Flags.Carry | Flags.HalfCarry | Flags.Negative);
        this._setFlag(Flags.Zero, this._regs.A === 0);
    }

    private _XOR_r(r: ByteRegister) : void {
        this._XOR_s(this._regs[r]);
    }

    private _XOR_n(r: ByteRegister) : void {
        this._XOR_s(this._fetchUByte());
    }

    private _XOR_$HL(r: ByteRegister) : void {
        this._XOR_s(this._mem.ReadByte(this._regs.HL));
    }

    private _CP_s(s: UByte) : void {
        const A_low = this._regs.A & 0x0f,
              s_low = s & 0x0f;

        const res = this._regs.A - s;

        this._setFlag(Flags.Carry, res < 0);
        this._setFlag(Flags.HalfCarry, A_low - s_low < 0);
        this._setFlag(Flags.Zero, (res & 0xff) === 0);
        this._unsetFlag(Flags.Negative);
    }

    private _CP_r(r: ByteRegister) : void {
        this._CP_s(this._regs[r]);
    }

    private _CP_n() : void {
        this._CP_s(this._fetchUByte());
    }

    private _CP_$HL() : void {
        this._CP_s(this._mem.ReadByte(this._regs.HL));
    }

    private _INC_r(r: ByteRegister) : void {
        const res = this._regs[r] += 1;

        this._setFlag(Flags.HalfCarry, (res & 0x0f) === 0);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.Negative);
    }

    private _INC_$HL() : void {
        const res = this._mem.ReadByte(this._regs.HL) + 1;
        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.HalfCarry, (res & 0x0f) === 0);
        this._setFlag(Flags.Zero, (res & 0xff) === 0);
        this._unsetFlag(Flags.Negative);
    }

    private _DEC_r(r: ByteRegister) : void {
        const res = this._regs[r] -= 1;

        this._setFlag(Flags.HalfCarry, (res & 0x0f) === 0x0f);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.Negative);
    }

    private _DEC_$HL() : void {
        const res = this._mem.ReadByte(this._regs.HL) - 1;
        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.HalfCarry, (res & 0x0f) === 0x0f);
        this._setFlag(Flags.Zero, (res & 0xff) === 0);
        this._setFlag(Flags.Negative);
    }

    /*
     * 16-bit Arithmetic operations.
     */
    private _ADD_HL_ss(ss: WordRegister|PointerRegister) : void {
        const hl_sec = this._regs.HL & 0x0fff,
              s_sec = this._regs[ss] & 0x0fff;

        const res = this._regs.HL + this._regs[ss];
        this._regs.HL = res;

        this._setFlag(Flags.Carry, res > 0xffff);
        this._setFlag(Flags.HalfCarry, hl_sec + s_sec > 0x0fff);
        this._unsetFlag(Flags.Negative);
    }

    private _ADD_SP_e() : void {
        const e = this._fetchByte();

        const spNib = this._regs.SP & 0x000f,
              eNib = e & 0x0f;

        const res = this._regs.SP + e;
        this._regs.SP = res;

        this._setFlag(Flags.Carry, res > 0xffff);
        this._setFlag(Flags.HalfCarry, spNib + eNib > 0x0f);
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
        const op = this._regs[r];

        this._regs[r] = (op >> 4) + (op << 4);

        this._resetFlags();
        this._setFlag(Flags.Zero, this._regs[r] === 0);
    }

    private _SWAP_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL);

        const res = (op >> 4) + (op << 4);

        this._mem.WriteByte(this._regs.HL, res);

        this._resetFlags();
        this._setFlag(Flags.Zero, (res & 0xff) === 0);
    }

    private _DAA() : void {
        // The LS nibble of Register A.
        const rNib = this._regs.A & 0x0f;

        // Check if the LS nibble is a non-BCD number.
        if (rNib > 9 || this._hasFlag(Flags.HalfCarry)) {
            this._regs.A += 0x06;
        }

        // The MS nibble of Register A.
        const lNib = this._regs.A >> 4;

        // Check if the MS nibble is a non-BCD number.
        // set Carry Flag if it was fixed, reset otherwise.
        if (lNib > 9 || this._hasFlag(Flags.Carry)) {
            this._regs.A += 0x60;
            this._setFlag(Flags.Carry);
        } else {
            this._unsetFlag(Flags.Carry);
        }

        this._setFlag(Flags.Zero, this._regs.A === 0);
        this._unsetFlag(Flags.HalfCarry);
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

    private _NOP() : void {
        // No Operation.
    }

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
        const msb = this._regs[r] >> 7;

        this._regs[r] = (this._regs[r] << 1) + msb;

        this._setFlag(Flags.Carry, msb === 1);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RLC_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL);

        const msb = op >> 7;
        const res = (op << 1) + msb;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb === 1);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RL_r(r: ByteRegister) : void {
        const cy = +this._hasFlag(Flags.Carry),
              msb = this._regs[r] >> 7;

        this._regs[r] = (this._regs[r] << 1) + cy;

        this._setFlag(Flags.Carry, msb === 1);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RL_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL),
              cy = +this._hasFlag(Flags.Carry);

        const res = (op << 1) + cy,
              msb = op >> 7;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb === 1);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RRC_r(r: ByteRegister) : void {
        const lsb = this._regs[r] << 7;

        this._regs[r] = (this._regs[r] >> 1) + lsb;

        this._setFlag(Flags.Carry, lsb > 0);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RRC_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL);

        const lsb = op << 7;
        const res = (op >> 1) + lsb;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, lsb > 0);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RR_r(r: ByteRegister) : void {
        const cy = +this._hasFlag(Flags.Carry),
              lsb = this._regs[r] & 0b00000001;

        this._regs[r] = (this._regs[r] >> 1) + cy;

        this._setFlag(Flags.Carry, lsb === 1);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _RR_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL),
              cy = +this._hasFlag(Flags.Carry);

        const res = (op >> 1) + cy,
              lsb = op & 0b00000001;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, lsb === 1);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SLA_r(r: ByteRegister) : void {
        const msb = this._regs[r] >> 7;

        this._regs[r] <<= 1;

        this._setFlag(Flags.Carry, msb === 1);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SLA_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL);

        const res =  op << 1,
              msb = op >> 7;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb === 1);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRA_r(r: ByteRegister) : void {
        const msb = this._regs[r] & 0b10000000;

        this._regs[r] = (this._regs[r] >> 1) + msb;

        this._setFlag(Flags.Carry, msb > 0);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRA_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL);

        const msb = op & 0b10000000;
        const res = (op >> 1) + msb;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, msb > 0);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRL_r(r: ByteRegister) : void {
        const lsb = this._regs[r] & 0b00000001;

        this._regs[r] >>= 1;

        this._setFlag(Flags.Carry, lsb === 1);
        this._setFlag(Flags.Zero, this._regs[r] === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    private _SRL_$HL() : void {
        const op = this._mem.ReadByte(this._regs.HL);

        const res =  op >> 1,
              lsb = op & 0b00000001;

        this._mem.WriteByte(this._regs.HL, res);

        this._setFlag(Flags.Carry, lsb === 1);
        this._setFlag(Flags.Zero, res === 0);
        this._unsetFlag(Flags.HalfCarry | Flags.Negative);
    }

    /*
     * Bit operations.
     */
    private _BIT_x_r(b: NBit, r: ByteRegister) : void {
        const musk = 1 << b;

        this._setFlag(Flags.HalfCarry);
        this._unsetFlag(Flags.Negative);
        this._setFlag(Flags.Zero, (this._regs[r] & musk) === 0);
    }

    private _BIT_b_$HL(b: NBit) : void {
        const op = this._mem.ReadByte(this._regs.HL),
              musk = 1 << b;

        this._setFlag(Flags.HalfCarry);
        this._unsetFlag(Flags.Negative);
        this._setFlag(Flags.Zero, (op & musk) === 0);
    }

    private _SET_b_r(b: NBit, r: ByteRegister) : void {
        this._regs[r] |= (1 << b);
    }

    private _SET_b_$HL(b: NBit) : void {
        const op = this._mem.ReadByte(this._regs.HL),
              set = 1 << b;

        this._mem.WriteByte(this._regs.HL, op | set);
    }

    private _RES_b_r(b: NBit, r: ByteRegister) : void {
        this._regs[r] &= ~(1 << b);
    }

    private _RES_b_$HL(b: NBit) : void {
        const op = this._mem.ReadByte(this._regs.HL),
              reset = ~(1 << b);

        this._mem.WriteByte(this._regs.HL, op & reset);
    }

    /*
     * Jump operations.
     */
    private _JP_nn() : void {
        this._regs.PC = this._fetchUWord();
    }

    private _JP_tf_nn(f: Flags, t: boolean) : void {
        if (t === this._hasFlag(f)) {
            this._regs.PC = this._fetchUWord();
        }
    }

    private _JP_HL() : void {
        this._regs.PC = this._regs.HL;
    }

    private _JP_e() : void {
        this._regs.PC += this._fetchByte();
    }

    private _JP_tf_e(f: Flags, t: boolean) : void {
        if (t === this._hasFlag(f)) {
            this._regs.PC += this._fetchByte();
        }
    }

    /*
     * Call operations.
     */
    private _CALL_nn() : void {
        this._stackPush(this._regs.PC);
        this._regs.PC = this._fetchUWord();
    }

    private _CALL_f_nn(f: Flags) : void {
        if (this._hasFlag(f)) {
            this._CALL_nn();
        }
    }

    private _CALL_Nf_nn(f: Flags) : void {
        if (!this._hasFlag(f)) {
            this._CALL_nn();
        }
    }

    /*
     * Restart operation.
     */
    private _RST_n(n: PageZeroLocation) : void {
        this._stackPush(this._regs.PC - 1);
        this._regs.PC = n;
    }

    /*
     * Return operations.
     */
    private _RET() : void {
        this._regs.PC = this._stackPop();
    }

    private _RET_tf(f: Flags, t: boolean) : void {
        if (t === this._hasFlag(f)) {
            this._regs.PC = this._stackPop();
        }
    }

    private _RETI() : void {
        // TODO: Should I enable interrupts immediately?
        this._regs.PC = this._stackPop();
        this._interrupts = InterruptsState.Enabling;
    }
}

export default Z80;