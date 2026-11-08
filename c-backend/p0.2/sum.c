# include <stdio.h>

int sum(int n) {
    int sum = 0;
    // int b = sum(1);
    for (int i = 1;i <= n; i++ ) {
        sum += i;
    }
    return sum;
}

int main() {
    int n = 100000;
    printf("Sum = %d\n", sum(n));
}