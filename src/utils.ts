import { Direction, Migration } from "./interfaces";

export function isNotNil<T>(value: T): value is T {
    return value !== null && value !== undefined;
}

export function isNil<T>(
    value: T | null | undefined,
): value is null | undefined {
    return value === null || value === undefined;
}

export const constants = {
    EXT: ".sql",
    SEP: "-",
    WHITESPACE: " ",
    UNDERSCORE: "_",
    EMPTY: "",
    UP: "up",
    DOWN: "down",
    BAR: "|",
} as const;

export function pad(input: string): string {
    return constants.WHITESPACE + input + constants.WHITESPACE;
}

export function formatName(input: string): string {
    return input.replaceAll(constants.SEP, constants.UNDERSCORE);
}

export function decode(input: string): Migration {
    const [extensionless] = input.split(constants.EXT);
    const [date, name, direction] = extensionless.split(constants.SEP);

    return {
        createdAt: new Date(parseInt(date, 10)),
        name,
        direction: direction as Direction | undefined,
    };
}

export function encode(input: Migration): string {
    const strBuilder: string[] = [];

    strBuilder.push(`${input.createdAt.getTime()}`);
    strBuilder.push(constants.SEP);
    strBuilder.push(formatName(input.name));
    if (input.direction) {
        strBuilder.push(constants.SEP);
        strBuilder.push(input.direction);
    }
    if (input.direction) {
        strBuilder.push(constants.EXT);
    }

    return strBuilder.join(constants.EMPTY);
}
