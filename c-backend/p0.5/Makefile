program: main.o util.o
	clang main.o util.o -o program

main.o: main.c util.h
	clang -c main.c -o main.o

util.o: util.c util.h
	clang -c util.c -o util.o 

clean:
	rm -f main.o util.o program

test:
	./program