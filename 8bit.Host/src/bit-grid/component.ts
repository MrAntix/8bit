import {
    Att, Component, Watch, getArrayOfNumbers, bits, Event, EventEmitter, emptyBitmap, html
} from '../global';
import css from './component.css';

@Component({
    css
})
export class ABitGridComponent extends HTMLElement implements IComponent {

    connectedCallback() {

        this.render();
    }

    value: bits[] = emptyBitmap;
    @Watch('value') valueChange() {

        this.draw();
    }

    @Att() showHeader: boolean = false;
    @Att() showBinary: boolean = false;

    @Att() selectedRow: number | null = null;
    @Watch('selectedRow') selectedRowChanged() {

        this.draw();
    }

    cells: HTMLElement[][] = [];
    binaries: HTMLElement[] = [];

    get rows() { return this.value?.length ?? 0; }
    get cols() { return (this.value?.at(0)?.length) ?? 0; }

    toggleValue(col: number, row: number) {

        if (!this.value) return;
        const flip: (value: unknown) => (1 | 0)
            = v => v === 1 ? 0 : 1;

        this.value = this.value.map((r, y) =>
            y === row
                ? r.map((c, x) => x === col ? flip(c) : c)
                : r
        );
    }

    setRowError(row: number, isError: boolean) {
        this.cells[row][0]!.parentElement!.classList.toggle('has-error', isError);
    }

    @Watch('showHeader')
    @Watch('showBinary')
    render() {

        return html`
            <table>
                ${this.renderHeader()}
                <tbody>
                    ${getArrayOfNumbers(this.rows).map(this.renderRow)}
                </tbody>
            </table>
        `;
    }

    renderHeader = () => {
        if (!this.showHeader) return null;

        return html`
            <thead><tr>
                ${getArrayOfNumbers(this.cols).map(i => html`<th>${Math.pow(2, i)}</th>`).reverse()}
                ${this.showBinary && html`<th></th>`}
            </tr></thead>
        `;
    };

    renderRow = (y: number) => {

        return html`<tr class="row" data-y="${y}">
            ${getArrayOfNumbers(this.cols).map(x => html`<td class="cell" data-x="${x}"></td>`)}
            ${this.showBinary && html`<th class="binary"></th>`}
        </tr>`;
    };

    afterRender() {

        this.cells = [...this.shadowRoot!.querySelectorAll('.row')]
            .map(row => [...row.querySelectorAll<HTMLElement>('.cell')]);
        this.binaries = [...this.shadowRoot!.querySelectorAll<HTMLElement>('.binary')];

        this.addEventListener('click', this.onClick);

        this.draw();
    }

    onClick: (e: MouseEvent) => void = e => {

        const cell = e.composedPath()
            .find(el => el instanceof HTMLElement
                && el.classList?.contains('cell')) as HTMLElement;
        if (cell == null) return;

        if (cell.dataset?.x == null
            || cell.parentElement?.dataset?.y == null) return;

        const col = parseInt(cell.dataset.x);
        const row = parseInt(cell.parentElement.dataset.y);

        this.select({ col, row });
    };

    draw() {
        this.cells?.forEach((row, y) => {
            if (this.showBinary && this.binaries[y]) {
                const binary = this.value?.at(y);
                this.binaries[y].innerText = binary ? binary.join('') : '00000000';
            }

            row[0].parentElement!.classList.toggle('selected', this.selectedRow == y);

            row.forEach((cell, x) =>
                cell.classList.toggle('on', this.value ? this.value[y][x] === 1 : false)
            );
        });
    }

    @Event() select!: EventEmitter<ABinaryGridSelect>;
}

export interface ABinaryGridSelect {
    col: number;
    row: number;
}