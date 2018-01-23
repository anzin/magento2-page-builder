import {outwardSearch} from "../../../utils/array";
import Config from "../../config";
import Column from "../column";
import ColumnGroup, {ResizeHistoryItem} from "../column-group";
import createBlock from "../factory";

/**
 * Get the maximum columns allowed
 *
 * @returns {number}
 */
export function getMaxColumns() {
    return 6;
}

/**
 * Get the smallest column width possible
 *
 * @returns {number}
 */
export function getSmallestColumnWidth() {
    return getAcceptedColumnWidth(parseFloat((100 / getMaxColumns()).toString()).toFixed(
        Math.round(100 / getMaxColumns()) !== 100 / getMaxColumns() ? 8 : 0,
    ));
}

/**
 * Get an accepted column width to resolve rounding issues, e.g. turn 49.995% into 50%
 *
 * @param width
 * @returns {number}
 */
export function getAcceptedColumnWidth(width: string) {
    let newWidth = 0;
    for (let i = getMaxColumns(); i > 0; i--) {
        const percentage = parseFloat((100 / getMaxColumns() * i).toFixed(
            Math.round((100 / getMaxColumns() * i)) !== (100 / getMaxColumns() * i) ? 8 : 0,
        ));
        // Allow for rounding issues
        if (parseFloat(width) > (percentage - 0.1) && parseFloat(width) < (percentage + 0.1)) {
            newWidth = percentage;
            break;
        }
    }
    return newWidth;
}

/**
 * Return the width of the column
 *
 * @param {Column} column
 * @returns {number}
 */
export function getColumnWidth(column: Column): number {
    return parseFloat(column.stage.store.get(column.id).width.toString());
}

/**
 * Retrieve the index of the column within it's group
 *
 * @param {Column} column
 * @returns {number}
 */
export function getColumnIndexInGroup(column: Column): number {
    return column.parent.children().indexOf(column);
}

/**
 * Retrieve the adjacent column based on a direction of +1 or -1
 *
 * @param {Column} column
 * @param {"+1" | "-1"} direction
 * @returns {any}
 */
export function getAdjacentColumn(column: Column, direction: "+1" | "-1"): Column {
    const currentIndex = getColumnIndexInGroup(column);
    if (typeof column.parent.children()[currentIndex + parseInt(direction, 10)] !== "undefined") {
        return (column.parent.children()[currentIndex + parseInt(direction, 10)] as Column);
    }
    return null;
}

/**
 * Update the width of a column
 *
 * @param {Column} column
 * @param {number} width
 */
export function updateColumnWidth(column: Column, width: number): void {
    column.stage.store.updateKey(
        column.id,
        parseFloat(width.toString()) + "%",
        "width",
    );
}

/**
 * Calculate the drop positions of a column group
 *
 * @param {ColumnGroup} group
 * @returns {any[]}
 */
export function calculateDropPositions(group: ColumnGroup): DropPosition[] {
    const dropPositions: any[] = [];
    group.children().forEach((column: Column, index: number) => {
        const left = column.element.position().left;
        const width = column.element.outerWidth();
        const canShrink = getColumnWidth(column) > getSmallestColumnWidth();
        dropPositions.push(
            {
                affectedColumn: column,
                canShrink,
                insertIndex: index,
                left,
                placement: "left",
                right: left + (width / 2),
            },
            {
                affectedColumn: column,
                canShrink,
                insertIndex: index + 1,
                left: left + (width / 2),
                placement: "right",
                right: left + width,
            },
        );
    });
    return dropPositions;
}

/**
 * Return the column width to 8 decimal places if it's not a whole number
 *
 * @param {number} width
 * @returns {string}
 */
export function getRoundedColumnWidth(width: number): number {
    return Number((width).toFixed(
        Math.round(width) !== width ? 8 : 0,
    ));
}

/**
 * Get the total width of all columns in the group
 *
 * @param {ColumnGroup} group
 * @returns {number}
 */
export function getColumnsWidth(group: ColumnGroup): number {
    return group.children().map((column: Column) => {
        return getColumnWidth(column);
    }).reduce((widthA, widthB) => {
        return widthA + (widthB ? widthB : 0);
    });
}

/**
 * Determine the pixel position of every column that can be created within the group
 *
 * @param {Column} column
 * @param {JQuery} group
 * @returns {ColumnWidth[]}
 */
export function determineColumnWidths(column: Column, group: JQuery): ColumnWidth[] {
    const singleColumnWidth = group.width() / getMaxColumns();
    const adjacentColumn = getAdjacentColumn(column, "+1");
    const columnWidths = [];
    const groupLeft = group.offset().left;
    const columnLeft = column.element.offset().left;
    const adjacentRightPosition = groupLeft + adjacentColumn.element.offset().left +
        adjacentColumn.element.outerWidth();

    // Iterate through the amount of columns generating the position for both left & right interactions
    for (let i = getMaxColumns(); i > 0; i--) {
        columnWidths.push(
            {
                forColumn: "left", // These positions are for the left column in the pair
                name: i + "/" + getMaxColumns(),
                position: Math.round(columnLeft + (singleColumnWidth * i)),
                width: getRoundedColumnWidth(100 / getMaxColumns() * i),
            },
        );
    }

    const currentWidth = Math.round(getColumnWidth(adjacentColumn) / getSmallestColumnWidth());
    for (let i = 1; i < getMaxColumns(); i++) {
        // The right interaction is only used when we're crushing a column that isn't adjacent
        columnWidths.push(
            {
                forColumn: "right", // These positions are for the left column in the pair
                name: i + "/" + getMaxColumns(),
                position: Math.round(adjacentRightPosition - ((i + 1) * singleColumnWidth) - singleColumnWidth),
                width: getRoundedColumnWidth(100 / getMaxColumns() * i),
            },
        );
    }

    return columnWidths;
}

/**
 * Resize a column to a specific width
 *
 * @param {Column} column
 * @param {number} width
 * @param {Column} shrinkableColumn
 */
export function resizeColumn(column: Column, width: number, shrinkableColumn: Column) {
    const current = getColumnWidth(column);
    const difference = (parseFloat(width.toString()) - current).toFixed(8);

    // Don't run the update if we've already modified the column
    if (current === parseFloat(width.toString())) {
        return;
    }

    updateColumnWidth(column, width);

    // Also shrink the closest shrinkable column
    if (difference && shrinkableColumn) {
        const currentShrinkable = getColumnWidth(shrinkableColumn);
        updateColumnWidth(
            shrinkableColumn,
            getAcceptedColumnWidth((currentShrinkable + -difference).toString()),
        );
    }
}

/**
 * Find a column which can be shrunk for the current resize action
 *
 * @param {Column} column
 * @param {"left" | "right"} direction
 * @returns {Column}
 */
export function findShrinkableColumnForResize(column: Column, direction: "left" | "right"): Column {
    const currentIndex = getColumnIndexInGroup(column);
    const parentChildren = column.parent.children();
    let searchArray: Column[];
    switch (direction) {
        case "right":
            searchArray = parentChildren.slice(currentIndex + 1) as Column[];
            break;
        case "left":
            searchArray = parentChildren.slice(0).reverse().slice(parentChildren.length - currentIndex) as Column[];
            break;
    }
    return searchArray.find((groupColumn: Column) => {
        return getColumnWidth(groupColumn) > getSmallestColumnWidth();
    }) as Column;
}

/**
 * Find a shrinkable column outwards from the current column
 *
 * @param {Column} column
 * @returns {Column}
 */
export function findShrinkableColumn(column: Column): Column {
    return outwardSearch(
        column.parent.children(),
        getColumnIndexInGroup(column),
        (neighbourColumn) => {
            return getColumnWidth(neighbourColumn) > getSmallestColumnWidth();
        },
    );
}

/**
 * Create a column and add it to it's parent
 *
 * @param {ColumnGroup} parent
 * @param {number} width
 * @param {number} index
 * @returns {Promise<void>}
 */
export function createColumn(parent: ColumnGroup, width: number, index?: number) {
    return createBlock(
        Config.getContentTypeConfig("column"),
        parent,
        parent.stage,
        {width: parseFloat(width.toString()) + "%"},
    ).then((column) => {
        parent.addChild(column, index);
        return column;
    });
}

export interface ColumnWidth {
    name: string;
    position: number;
    width: number;
    forColumn: string;
}

export interface DropPosition {
    left: number;
    right: number;
    insertIndex: number;
    placement: string;
    affectedColumn: Column;
    canShrink: boolean;
}