#include <stdio.h>

// A is 65 and a is 97
// abcdefghijklmnopqrstuvwxyz
int main() {
    char sent[] = "The Quick Brown Fox";
    int cnt = 0;
    for (int i = 0; i < sizeof(sent); i++) {
        if ((sent[i] >= 65 && sent[i] <= 90) ) {
            int pos = sent[i] - 65;
            if (pos == 0 || pos == 4 || pos == 8 || pos == 14 || pos == 20) {
                cnt++;
            }
        } else if (sent[i] >= 97 && sent[i] <= 122) {
            int pos = sent[i] - 97;
            if (pos == 0 || pos == 4 || pos == 8 || pos == 14 || pos == 20) {
                cnt++;
            }
        }
    }
    printf("Total vowel cnt : %d\n", cnt);
}