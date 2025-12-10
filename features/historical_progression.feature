Feature: Historical Progression system

  Scenario: Game Starts in 1957
    Given I am on the Main Menu
    When I click the "New Game" button
    And I click the "Continue / Play" button
    Then I should see the Game Canvas
    And the Game Date Year should be 1957

  Scenario: Basic Parts Available in 1957
    Given I am on the Hub Screen
    When I click the "Build Rocket" button
    Then I should see the Hangar UI
    And I should see "Command Pod Mk1" in the parts list
    And I should not see "Apollo Capsule" in the parts list

  Scenario: Chronology Menu Displays Events
    Given I am on the Hub Screen
    When I click the "Chronology" button
    Then I should see the Chronology Timeline
    When I click the "1957" timeline node
    Then I should see "Sputnik 1" in the timeline
    When I close the Chronology Menu
    Then I should see the Main Menu container
