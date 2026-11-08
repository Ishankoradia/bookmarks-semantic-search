#include <stdio.h>

int main() {
    int arr[5] =  {3, 9, 2, 15, 7};
    int n = sizeof(arr) / sizeof(arr[0]);

    int max = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }

    printf("Max = %d\n", max);
}