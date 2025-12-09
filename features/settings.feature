Feature: User Settings

  Scenario: User changes nickname
    Given I am on the Main Menu
    When I open Settings
    And I type "Maverick" into the nickname field
    And I click "Save Settings"
    And I confirm the save
    Then I should see a success notification "Settings saved"
    And the nickname field should still contain "Maverick"
