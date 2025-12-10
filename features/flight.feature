Feature: Flight Controls
  As a pilot
  I want to control the rocket's systems
  So that I can fly the mission

  @wip
  Scenario: Control Throttle, SAS, and RCS
    Given I have launched a rocket
    
    # Throttle defaults to 0
    When I press the "Shift" key
    Then the Throttle should be greater than 0%
    
    # SAS defaults to ON
    Then the "SAS" indicator should be active
    When I press the "t" key
    Then the "SAS" indicator should be inactive
    When I press the "t" key
    Then the "SAS" indicator should be active
    
    # RCS defaults to ON
    Then the "RCS" indicator should be active
    When I press the "r" key
    Then the "RCS" indicator should be inactive
    When I press the "r" key
    Then the "RCS" indicator should be active
