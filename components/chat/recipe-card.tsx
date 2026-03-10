"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, ChefHat, Leaf, Star, BookOpen, Heart, ImageOff } from "lucide-react"
import type { Recipe } from "@/types/runash-chat"

interface RecipeCardProps {
  recipe: Recipe
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const handleViewRecipe = () => {
    console.log("View recipe:", recipe.name)
  }

  const handleSaveRecipe = () => {
    console.log("Save recipe:", recipe.name)
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.imageAlt ?? recipe.name} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            <ImageOff className="mr-1 h-4 w-4" /> Media unavailable
          </div>
        )}
        <div className="absolute top-2 left-2 flex space-x-1">
          <Badge className={getDifficultyColor(recipe.difficulty)}>{recipe.difficulty}</Badge>
          <Badge className="bg-green-600 text-white">
            <Leaf className="h-3 w-3 mr-1" />
            Sustainable
          </Badge>
        </div>
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white/90 rounded-full px-2 py-1">
          <Star className="h-3 w-3 text-yellow-500 fill-current" />
          <span className="text-xs font-medium">{recipe.sustainabilityScore}/10</span>
        </div>
      </div>

      <CardHeader className="pb-2">
        <h4 className="font-medium">{recipe.name}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{recipe.description}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {recipe.prepTime + recipe.cookTime} min
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {recipe.servings} servings
          </div>
          <div className="flex items-center">
            <ChefHat className="h-4 w-4 mr-1" />
            {recipe.difficulty}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {recipe.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{recipe.tags.length - 3} more
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs text-center mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div>
            <div className="font-medium">{recipe.nutritionalInfo.calories}</div>
            <div className="text-gray-500">cal</div>
          </div>
          <div>
            <div className="font-medium">{recipe.nutritionalInfo.protein}g</div>
            <div className="text-gray-500">protein</div>
          </div>
          <div>
            <div className="font-medium">{recipe.nutritionalInfo.carbs}g</div>
            <div className="text-gray-500">carbs</div>
          </div>
          <div>
            <div className="font-medium">{recipe.nutritionalInfo.fiber}g</div>
            <div className="text-gray-500">fiber</div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleViewRecipe}
            className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            View Recipe
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveRecipe}>
            <Heart className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
