package com.jc.poker.app;

import java.util.Comparator;

import com.jc.poker.businessobjects.Person;

public class CardComparator implements Comparator<Person> {

	@Override
	public int compare(Person person1, Person person2) {
		// TODO Auto-generated method stub
		
		return (myHighCard(person1) > myHighCard(person2)) ? -1 : 1;
	}
	
	private Long myHighCard(Person person) {
		return (person.getFirstCard().getNumber() > person.getSecondCard().getNumber() || (person.getFirstCard().getNumber() == person.getSecondCard().getNumber())) ?
				person.getFirstCard().getNumber() : person.getSecondCard().getNumber();
	}

}
