#include <stdio.h>
#include "util.h"

int main() {
    int arr[5] =  {3, 9, 2, 15, 7};
    size_t n = sizeof(arr) / sizeof(arr[0]);

    int max = max_of_arr(arr, n);

    printf("Max = %d\n", max);
}