export interface RestResponse<T> {
    statusCode: number;
    error: string | null;
    message: string;
    data: T | null;
}

export interface ResultPaginationDTO<T> {
    meta: {
        page: number;
        pageSize: number;
        pages: number;
        total: number;
    };
    result: T[];
}

export interface PaginationParams {
    page?: number;
    size?: number;
    sort?: string;
    filter?: string;
}
