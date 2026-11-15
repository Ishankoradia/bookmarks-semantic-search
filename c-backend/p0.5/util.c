#include "util.h"

int max_of_arr(int arr[], size_t n) {
    int max = arr[0];
    for (size_t i = 1; i < n; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }

    return max;
}