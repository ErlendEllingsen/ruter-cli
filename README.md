# ruter-cli 🚂
*ruter-cli* is an open source command line tool that quickly allows you to plan trips and find next departures when using public transportation in Oslo, Norway (And all other areas that Ruter cover).

A command line tool for public transportation in Oslo, Norway. 

This little toy is available as a result of [Entur](https://developer.entur.org/)

## Installation
`npm install ruter-cli -g` 

## Usage
`ruter <from> <to>` 

## Optional flags 
```
--proposals=5 //Number of travel proposals, default 5, max 40
```

### Example
Command ran:

`ruter eiksmarka bjørkelangen`

Output: 
![ruter-cli example usage](https://i.imgur.com/fbmAKBI.png)

## License
MIT License

Copyright (c) 2016 Erlend Ellingsen
